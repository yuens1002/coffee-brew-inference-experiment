// @ts-nocheck
/**
 * Coffee Brew Inference Experiment - TypeScript Entry Point
 * Anchored TypeScript codebase with Python/DSPy inference subfolder
 * Uses sql.js (pure JS, no native deps)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;

// @ts-ignore - sql.js doesn't have types
const initSqlJs = require('sql.js');

// ── Types (use JSDoc for type safety)
/**
 * @typedef {Object} BrewingMethod
 * @property {number} [id]
 * @property {string} name
 * @property {string} description
 * @property {number} default_ratio
 * @property {number} default_temp_c
 * @property {number} default_brew_time_s
 * @property {string} grind_size
 */

/**
 * @typedef {Object} BrewRecord
 * @property {number} [id]
 * @property {number} brewing_method_id
 * @property {string} [brewing_method]
 * @property {string} origin
 * @property {string} roast_level
 * @property {string} grind_size
 * @property {number} water_temp_c
 * @property {number} ratio
 * @property {number} brew_time_s
 * @property {number} rating
 * @property {string} [notes]
 * @property {string} [created_at]
 */

// ── Database setup (sql.js - pure JS)
const __filename = path.basename(__filename);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../db/brews.db');

let db = null;
let SQL = null;
let dbReady = false;

async function initDB() {
  try {
    SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    });

    // Try to load existing DB from file system
    let buf;
    try {
      buf = await fsPromises.readFile(dbPath);
      db = new SQL.Database(new Uint8Array(buf));
      console.log(`✓ Loaded existing DB from ${dbPath}`);
    } catch (e) {
      // Create new DB
      db = new SQL.Database();
      console.log(`✓ Created new DB`);
    }

    // Initialize schema
    db.run(`
      CREATE TABLE IF NOT EXISTS brewing_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        default_ratio REAL,
        default_temp_c INTEGER,
        default_brew_time_s INTEGER,
        grind_size TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS brews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brewing_method_id INTEGER,
        origin TEXT NOT NULL,
        roast_level TEXT NOT NULL,
        grind_size TEXT NOT NULL,
        water_temp_c INTEGER NOT NULL,
        ratio REAL NOT NULL,
        brew_time_s INTEGER NOT NULL,
        rating REAL NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (brewing_method_id) REFERENCES brewing_methods(id)
      )
    `);

    // Seed brewing methods if empty
    const countResult = db.exec('SELECT COUNT(*) as count FROM brewing_methods');
    const count = countResult[0]?.values[0][0] || 0;

    if (count === 0) {
      const methods = [
        ['Pour Over', 'Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)', 0.0625, 93, 210, 'medium-fine'],
        ['French Press', 'Coffee steeped in hot water, separated by metal mesh filter', 0.0588, 96, 240, 'coarse'],
        ['Espresso', 'High-pressure water forced through finely-ground coffee', 0.125, 93, 30, 'fine'],
        ['AeroPress', 'Immersion and pressure brewing with paper filter', 0.0714, 90, 90, 'medium-fine'],
        ['Cold Brew', 'Coffee steeped in cold water for extended period', 0.125, 20, 43200, 'coarse'],
        ['Moka Pot', 'Stovetop brewing using steam pressure', 0.0833, 90, 300, 'medium'],
        ['Siphon', 'Vacuum brewing with cloth filter', 0.0625, 93, 180, 'medium-fine'],
        ['Turkish/Ibrik', 'Finely ground coffee simmered in water with sugar', 0.1111, 95, 180, 'extra-fine']
      ];

      const stmt = db.prepare(`
        INSERT INTO brewing_methods (name, description, default_ratio, default_temp_c, default_brew_time_s, grind_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const m of methods) {
        stmt.run(m);
      }
      stmt.free();
      console.log('✓ Seeded brewing methods');
    }

    // Save DB to file
    const data = db.export();
    await fsPromises.writeFile(dbPath, Buffer.from(data));
    dbReady = true;
    console.log(`✓ Database ready at ${dbPath}`);
  } catch (err) {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  }
}

// Helper to run query and get results
function queryDB(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// ── Express app
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../landing')));

// ── Middleware to ensure DB is ready
app.use((_req, res, next) => {
  if (!dbReady) {
    return res.status(503).json({ error: 'Database initializing, please try again' });
  }
  next();
});

// ── Routes

// Home
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../landing/index.html'));
});

// GET /brewing-methods
app.get('/brewing-methods', (_req, res) => {
  try {
    const methods = queryDB('SELECT * FROM brewing_methods ORDER BY id');
    res.json(methods);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brewing methods', details: String(err) });
  }
});

// POST /recommend — calls Python/DSPy script
app.post('/recommend', async (req, res) => {
  const brewData = req.body;

  const required = ['brewing_method_id', 'origin', 'roast_level', 'grind_size', 'water_temp_c', 'ratio', 'brew_time_s'];
  for (const field of required) {
    if (!(field in brewData)) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  try {
    // Get brewing method name
    const methods = queryDB('SELECT name FROM brewing_methods WHERE id = ?', [brewData.brewing_method_id]);
    const methodName = methods[0]?.name || 'Unknown';

    // Placeholder recommendation (TODO: integrate DSPy)
    const recommendation = `For ${brewData.origin} ${brewData.roast_level} roast using ${methodName}, try ${brewData.water_temp_c}°C water, ${(1/brewData.ratio).toFixed(0)}:1 ratio, and ${brewData.brew_time_s}s brew time with ${brewData.grind_size} grind.`;

    res.json({
      brewing_method: methodName,
      input: brewData,
      recommendation,
      confidence: 'medium'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get recommendation', details: String(err) });
  }
});

// GET /brews
app.get('/brews', (_req, res) => {
  try {
    const { limit, origin, method } = _req.query;
    let query = `
      SELECT b.*, m.name as brewing_method 
      FROM brews b 
      LEFT JOIN brewing_methods m ON b.brewing_method_id = m.id 
      WHERE 1=1
    `;
    const params = [];

    if (origin) {
      query += ' AND b.origin = ?';
      params.push(origin);
    }
    if (method) {
      query += ' AND b.brewing_method_id = ?';
      params.push(Number(method));
    }

    query += ' ORDER BY b.created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(Number(limit));
    }

    const brews = queryDB(query, params);
    res.json({ count: brews.length, brews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brews', details: String(err) });
  }
});

// POST /brews — Log a real-world brew experience
app.post('/brews', async (req, res) => {
  const brew = req.body;

  const required = ['brewing_method_id', 'origin', 'roast_level', 'grind_size', 'water_temp_c', 'ratio', 'brew_time_s', 'rating'];
  for (const field of required) {
    if (!(field in brew)) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO brews (brewing_method_id, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, rating, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      brew.brewing_method_id,
      brew.origin,
      brew.roast_level,
      brew.grind_size,
      brew.water_temp_c,
      brew.ratio,
      brew.brew_time_s,
      brew.rating,
      brew.notes || null
    ]);
    stmt.free();

    // Save DB to disk
    const data = db.export();
    await fsPromises.writeFile(dbPath, Buffer.from(data));

    const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
    const lastId = lastIdResult[0]?.values[0][0];
    res.status(201).json({ id: lastId, message: 'Brew record added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add brew', details: String(err) });
  }
});

// GET /brews/:id/compare — Compare brew against AI recommendation
app.get('/brews/:id/compare', (_req, res) => {
  try {
    const brewId = Number(_req.params.id);

    // Get the brew record
    const brews = queryDB(`
      SELECT b.*, m.name as brewing_method, m.default_ratio, m.default_temp_c, m.default_brew_time_s, m.grind_size as method_grind
      FROM brews b 
      LEFT JOIN brewing_methods m ON b.brewing_method_id = m.id 
      WHERE b.id = ?
    `, [brewId]);

    if (brews.length === 0) {
      return res.status(404).json({ error: 'Brew record not found' });
    }

    const brew = brews[0];

    // AI recommendation (what should have been done)
    const aiRecommendation = {
      water_temp_c: brew.default_temp_c || 93,
      ratio: brew.default_ratio || 0.0625,
      brew_time_s: brew.default_brew_time_s || 210,
      grind_size: brew.method_grind || 'medium-fine'
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
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`☕ Coffee Brew API running on http://localhost:${PORT}`);
    console.log(`   DB location: ${dbPath}`);
    console.log(`   Landing page: http://localhost:${PORT}/`);
  });
});

module.exports = app;
