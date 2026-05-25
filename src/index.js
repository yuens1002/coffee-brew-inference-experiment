/**
 * Coffee Brew Inference Experiment - TypeScript Entry Point
 * Simplified prototype using JSON file store (no sql.js WASM issues)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { spawn } = require('child_process');

// ── Data Paths
const dataDir = path.join(__dirname, '../data');
const methodsFile = path.join(dataDir, 'brewing_methods.json');
const brewsFile = path.join(dataDir, 'brews.json');

// ── In-Memory Store
let brewingMethods = [];
let brews = [];
let nextMethodId = 1;
let nextBrewId = 1;

// ── Initialize Data
async function initData() {
  try {
    await fsPromises.mkdir(dataDir, { recursive: true });

    // Load or create brewing methods
    try {
      const data = await fsPromises.readFile(methodsFile, 'utf8');
      brewingMethods = JSON.parse(data);
      nextMethodId = Math.max(...brewingMethods.map(m => m.id), 0) + 1;
      console.log(`✓ Loaded ${brewingMethods.length} brewing methods from ${methodsFile}`);
    } catch {
      // Seed with default methods
      brewingMethods = [
        { id: 1, name: 'Pour Over', description: 'Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)', default_ratio: 0.0625, default_temp_c: 93, default_brew_time_s: 210, grind_size: 'medium-fine' },
        { id: 2, name: 'French Press', description: 'Coffee steeped in hot water, separated by metal mesh filter', default_ratio: 0.0588, default_temp_c: 96, default_brew_time_s: 240, grind_size: 'coarse' },
        { id: 3, name: 'Espresso', description: 'High-pressure water forced through finely-ground coffee', default_ratio: 0.125, default_temp_c: 93, default_brew_time_s: 30, grind_size: 'fine' },
        { id: 4, name: 'AeroPress', description: 'Immersion and pressure brewing with paper filter', default_ratio: 0.0714, default_temp_c: 90, default_brew_time_s: 90, grind_size: 'medium-fine' },
        { id: 5, name: 'Cold Brew', description: 'Coffee steeped in cold water for extended period', default_ratio: 0.125, default_temp_c: 20, default_brew_time_s: 43200, grind_size: 'coarse' },
        { id: 6, name: 'Moka Pot', description: 'Stovetop brewing using steam pressure', default_ratio: 0.0833, default_temp_c: 90, default_brew_time_s: 300, grind_size: 'medium' },
        { id: 7, name: 'Siphon', description: 'Vacuum brewing with cloth filter', default_ratio: 0.0625, default_temp_c: 93, default_brew_time_s: 180, grind_size: 'medium-fine' },
        { id: 8, name: 'Turkish/Ibrik', description: 'Finely ground coffee simmered in water with sugar', default_ratio: 0.1111, default_temp_c: 95, default_brew_time_s: 180, grind_size: 'extra-fine' }
      ];
      nextMethodId = 9;
      await saveMethods();
      console.log(`✓ Seeded ${brewingMethods.length} brewing methods`);
    }

    // Load brews
    try {
      const data = await fsPromises.readFile(brewsFile, 'utf8');
      brews = JSON.parse(data);
      nextBrewId = Math.max(...brews.map(b => b.id), 0) + 1;
      console.log(`✓ Loaded ${brews.length} brew records from ${brewsFile}`);
    } catch {
      brews = [];
      nextBrewId = 1;
      console.log(`✓ Created new brews store`);
    }

    console.log(`✓ Data initialized. Methods: ${brewingMethods.length}, Brews: ${brews.length}`);
  } catch (err) {
    console.error('Failed to initialize data:', err);
    process.exit(1);
  }
}

async function saveMethods() {
  await fsPromises.writeFile(methodsFile, JSON.stringify(brewingMethods, null, 2));
}

async function saveBrews() {
  await fsPromises.writeFile(brewsFile, JSON.stringify(brews, null, 2));
}

// ── Express app
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../landing')));

// ── Routes

// Home
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../landing/index.html'));
});

// GET /brewing-methods
app.get('/brewing-methods', (_req, res) => {
  res.json(brewingMethods);
});

// ── Helper: Generate recommendation from brewing method defaults
function generateRecommendation(methodName, grindSize, waterTemp, brewTime) {
  const method = brewingMethods.find(m => m.name.toLowerCase() === methodName.toLowerCase());
  
  if (!method) {
    return {
      recommendation: `For ${methodName}, use ${grindSize} grind at ${waterTemp}°C for ${brewTime}s. Adjust parameters based on taste preferences.`,
      confidence: 'low',
      sources: ['default']
    };
  }
  
  const tips = [];
  if (waterTemp < method.default_temp_c - 5) tips.push(`increase water temp to ~${method.default_temp_c}°C`);
  if (waterTemp > method.default_temp_c + 5) tips.push(`decrease water temp to ~${method.default_temp_c}°C`);
  if (grindSize !== method.grind_size) tips.push(`use ${method.grind_size} grind for ${method.name}`);
  if (Math.abs(brewTime - method.default_brew_time_s) > 30) tips.push(`adjust brew time to ~${method.default_brew_time_s}s`);
  
  const recommendation = tips.length > 0
    ? `For ${methodName}: ${tips.join(', ')}. ${method.description}`
    : `Your parameters look good for ${methodName}! Enjoy your brew.`;
  
  return {
    recommendation,
    confidence: tips.length === 0 ? 'high' : 'medium',
    sources: ['brewing_methods.json', method.description]
  };
}

// POST /recommend - Inference endpoint (pure JS, no Python dependency)
app.post('/recommend', async (req, res) => {
  const { method, grind_size, water_temp, brew_time } = req.body;
  
  // Validate required fields
  const required = ['method', 'grind_size', 'water_temp', 'brew_time'];
  const missing = required.filter(field => !(field in req.body));
  if (missing.length > 0) {
    return res.status(400).json({ 
      error: 'Missing required fields', 
      missing_fields: missing 
    });
  }
  
  // Validate numeric fields
  if (isNaN(water_temp) || isNaN(brew_time)) {
    return res.status(400).json({ 
      error: 'water_temp and brew_time must be numeric' 
    });
  }
  
  try {
    const result = generateRecommendation(method, grind_size, Number(water_temp), Number(brew_time));
    res.json(result);
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ 
      error: 'Failed to get recommendation', 
      details: String(err) 
    });
  }
});

// GET /brews
app.get('/brews', (_req, res) => {
  try {
    const { limit, origin, method } = _req.query;
    let filtered = [...brews];

    if (origin) {
      filtered = filtered.filter(b => b.origin === origin);
    }
    if (method) {
      filtered = filtered.filter(b => b.brewing_method_id === Number(method));
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (limit) {
      filtered = filtered.slice(0, Number(limit));
    }

    // Add method names
    const result = filtered.map(b => ({
      ...b,
      brewing_method: brewingMethods.find(m => m.id === b.brewing_method_id)?.name || 'Unknown'
    }));

    res.json({ count: result.length, brews: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brews', details: String(err) });
  }
});

// POST /brews
app.post('/brews', async (req, res) => {
  const brew = req.body;

  const required = ['brewing_method_id', 'origin', 'roast_level', 'grind_size', 'water_temp_c', 'ratio', 'brew_time_s', 'rating'];
  for (const field of required) {
    if (!(field in brew)) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  try {
    const newBrew = {
      id: nextBrewId++,
      ...brew,
      created_at: new Date().toISOString()
    };
    brews.push(newBrew);
    await saveBrews();

    res.status(201).json({ id: newBrew.id, message: 'Brew record added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add brew', details: String(err) });
  }
});

// GET /brews/:id/compare
app.get('/brews/:id/compare', (_req, res) => {
  try {
    const brewId = Number(_req.params.id);
    const brew = brews.find(b => b.id === brewId);

    if (!brew) {
      return res.status(404).json({ error: 'Brew record not found' });
    }

    const method = brewingMethods.find(m => m.id === brew.brewing_method_id);

    // AI recommendation (method defaults)
    const aiRecommendation = {
      water_temp_c: method?.default_temp_c || 93,
      ratio: method?.default_ratio || 0.0625,
      brew_time_s: method?.default_brew_time_s || 210,
      grind_size: method?.grind_size || 'medium-fine'
    };

    // Simple analysis
    const tempDiff = brew.water_temp_c - aiRecommendation.water_temp_c;
    const timeDiff = brew.brew_time_s - aiRecommendation.brew_time_s;
    let analysis = '';

    if (Math.abs(tempDiff) <= 2 && Math.abs(timeDiff) <= 15) {
      analysis = 'Your brew parameters are very close to optimal!';
    } else {
      const issues = [];
      if (tempDiff > 2) issues.push(`water temp is ${tempDiff}°C too high`);
      if (tempDiff < -2) issues.push(`water temp is ${Math.abs(tempDiff)}°C too low`);
      if (timeDiff > 15) issues.push(`brew time is ${timeDiff}s too long`);
      if (timeDiff < -15) issues.push(`brew time is ${Math.abs(timeDiff)}s too short`);
      analysis = `Your brew ${issues.join(' and ')}. Try adjusting to the recommended parameters.`;
    }

    // Simple match score
    const tempScore = 1 - Math.min(Math.abs(tempDiff) / 10, 1);
    const timeScore = 1 - Math.min(Math.abs(timeDiff) / 60, 1);
    const match_score = Math.round(((tempScore + timeScore) / 2) * 100) / 100;

    res.json({
      brew_id: brewId,
      user_brew: {
        water_temp_c: brew.water_temp_c,
        ratio: brew.ratio,
        brew_time_s: brew.brew_time_s,
        grind_size: brew.grind_size,
        rating: brew.rating
      },
      ai_recommendation: aiRecommendation,
      analysis,
      match_score
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compare brew', details: String(err) });
  }
});

// ── Start server
initData().then(() => {
  app.listen(PORT, () => {
    console.log(`☕ Coffee Brew API running on http://localhost:${PORT}`);
    console.log(`   Data directory: ${dataDir}`);
    console.log(`   Landing page: http://localhost:${PORT}/`);
  });
});

module.exports = app;
