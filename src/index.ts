/**
 * Coffee Brew Inference Experiment - TypeScript Entry Point
 * Anchored TypeScript codebase with Python/DSPy inference subfolder
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Database, Statement } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

// ── Types
export interface BrewingMethod {
  id?: number;
  name: string;
  description: string;
  default_ratio: number;
  default_temp_c: number;
  default_brew_time_s: number;
  grind_size: string;
}

export interface BrewRecord {
  id?: number;
  brewing_method_id: number;
  brewing_method?: string;
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
  rating: number;
  notes?: string;
  created_at?: string;
}

export interface RecommendationRequest {
  brewing_method_id: number;
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
}

export interface RecommendationResponse {
  brewing_method?: string;
  input?: RecommendationRequest;
  recommendation: string;
  confidence?: 'high' | 'medium' | 'low';
}

// ── Database setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../db/brews.db');

let db: Database;
try {
  db = new Database(dbPath);
  console.log(`✓ Connected to SQLite DB at ${dbPath}`);
} catch (err) {
  console.error('Failed to connect to DB:', err);
  process.exit(1);
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS brewing_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    default_ratio REAL,
    default_temp_c INTEGER,
    default_brew_time_s INTEGER,
    grind_size TEXT
  );

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
  );
`);

// Seed brewing methods if table is empty
const methodCount = db.prepare('SELECT COUNT(*) as count FROM brewing_methods').get() as { count: number };
if (methodCount.count === 0) {
  const methods = [
    { name: 'Pour Over', description: 'Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)', default_ratio: 0.0625, default_temp_c: 93, default_brew_time_s: 210, grind_size: 'medium-fine' },
    { name: 'French Press', description: 'Coffee steeped in hot water, separated by metal mesh filter', default_ratio: 0.0588, default_temp_c: 96, default_brew_time_s: 240, grind_size: 'coarse' },
    { name: 'Espresso', description: 'High-pressure water forced through finely-ground coffee', default_ratio: 0.125, default_temp_c: 93, default_brew_time_s: 30, grind_size: 'fine' },
    { name: 'AeroPress', description: 'Immersion and pressure brewing with paper filter', default_ratio: 0.0714, default_temp_c: 90, default_brew_time_s: 90, grind_size: 'medium-fine' },
    { name: 'Cold Brew', description: 'Coffee steeped in cold water for extended period', default_ratio: 0.125, default_temp_c: 20, default_brew_time_s: 43200, grind_size: 'coarse' },
    { name: 'Moka Pot', description: 'Stovetop brewing using steam pressure', default_ratio: 0.0833, default_temp_c: 90, default_brew_time_s: 300, grind_size: 'medium' },
    { name: 'Siphon', description: 'Vacuum brewing with cloth filter', default_ratio: 0.0625, default_temp_c: 93, default_brew_time_s: 180, grind_size: 'medium-fine' },
    { name: 'Turkish/Ibrik', description: 'Finely ground coffee simmered in water with sugar', default_ratio: 0.1111, default_temp_c: 95, default_brew_time_s: 180, grind_size: 'extra-fine' },
  ];

  const stmt = db.prepare('INSERT INTO brewing_methods (name, description, default_ratio, default_temp_c, default_brew_time_s, grind_size) VALUES (?, ?, ?, ?, ?, ?)');
  for (const m of methods) {
    stmt.run(m.name, m.description, m.default_ratio, m.default_temp_c, m.default_brew_time_s, m.grind_size);
  }
  console.log('✓ Seeded brewing methods');
}

// ── Express app
const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../landing')));

// ── Routes

// Home
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../landing/index.html'));
});

// GET /brewing-methods
app.get('/brewing-methods', (_req: Request, res: Response) => {
  try {
    const stmt: Statement = db.prepare('SELECT * FROM brewing_methods ORDER BY id');
    const methods = stmt.all();
    res.json(methods);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brewing methods', details: String(err) });
  }
});

// POST /recommend — calls Python/DSPy script
app.post('/recommend', async (req: Request, res: Response) => {
  const brewData: RecommendationRequest = req.body;

  // Validate required fields
  const required = ['brewing_method_id', 'origin', 'roast_level', 'grind_size', 'water_temp_c', 'ratio', 'brew_time_s'];
  for (const field of required) {
    if (!(field in brewData)) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  try {
    // Get brewing method name
    const methodStmt = db.prepare('SELECT name FROM brewing_methods WHERE id = ?');
    const method = methodStmt.get(brewData.brewing_method_id) as { name: string } | undefined;
    const methodName = method?.name || 'Unknown';

    // Call Python/DSPy script via child_process
    const pyScript = path.join(__dirname, '../inference/brew_inference.py');
    const args = [
      '--origin', brewData.origin,
      '--roast', brewData.roast_level,
      '--grind', brewData.grind_size,
      '--temp', String(brewData.water_temp_c),
      '--ratio', String(brewData.ratio),
      '--time', String(brewData.brew_time_s)
    ];

    // For now, return a placeholder recommendation (DSPy integration TODO)
    // TODO: Implement actual Python script call
    const recommendation: RecommendationResponse = {
      brewing_method: methodName,
      input: brewData,
      recommendation: `For ${brewData.origin} ${brewData.roast_level} roast using ${methodName}, try ${brewData.water_temp_c}°C water, ${(1/brewData.ratio).toFixed(0)}:1 ratio, and ${brewData.grind_size} grind. Adjust brew time to ${brewData.brew_time_s}s for optimal extraction.`,
      confidence: 'medium'
    };

    res.json(recommendation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get recommendation', details: String(err) });
  }
});

// GET /brews
app.get('/brews', (req: Request, res: Response) => {
  try {
    const { limit, origin, method } = req.query;
    let query = `
      SELECT b.*, m.name as brewing_method 
      FROM brews b 
      LEFT JOIN brewing_methods m ON b.brewing_method_id = m.id 
      WHERE 1=1
    `;
    const params: any[] = [];

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

    const stmt: Statement = db.prepare(query);
    const brews = stmt.all(...params);
    res.json({ count: brews.length, brews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brews', details: String(err) });
  }
});

// POST /brews — Log a real-world brew experience
app.post('/brews', (req: Request, res: Response) => {
  const brew: BrewRecord = req.body;

  const required = ['brewing_method_id', 'origin', 'roast_level', 'grind_size', 'water_temp_c', 'ratio', 'brew_time_s', 'rating'];
  for (const field of required) {
    if (!(field in brew)) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  try {
    const stmt: Statement = db.prepare(`
      INSERT INTO brews (brewing_method_id, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, rating, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      brew.brewing_method_id,
      brew.origin,
      brew.roast_level,
      brew.grind_size,
      brew.water_temp_c,
      brew.ratio,
      brew.brew_time_s,
      brew.rating,
      brew.notes || null
    );

    res.status(201).json({ id: result.lastInsertRowid, message: 'Brew record added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add brew', details: String(err) });
  }
});

// GET /brews/:id/compare — Compare brew against AI recommendation
app.get('/brews/:id/compare', (req: Request, res: Response) => {
  try {
    const brewId = Number(req.params.id);

    // Get the brew record
    const brewStmt = db.prepare(`
      SELECT b.*, m.name as brewing_method, m.default_ratio, m.default_temp_c, m.default_brew_time_s, m.grind_size as method_grind
      FROM brews b 
      LEFT JOIN brewing_methods m ON b.brewing_method_id = m.id 
      WHERE b.id = ?
    `);
    const brew = brewStmt.get(brewId) as any;

    if (!brew) {
      return res.status(404).json({ error: 'Brew record not found' });
    }

    // AI recommendation (what should have been done)
    // TODO: Call DSPy for actual recommendation
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
app.listen(PORT, () => {
  console.log(`☕ Coffee Brew API running on http://localhost:${PORT}`);
  console.log(`   TypeScript entry: ${__filename}`);
  console.log(`   DB location: ${dbPath}`);
  console.log(`   Landing page: http://localhost:${PORT}/`);
});

export default app;
