/**
 * Coffee Brew Inference Experiment - TypeScript Entry Point
 * Anchored TypeScript codebase with Python/DSPy inference subfolder
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Database, Statement } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Types
export interface BrewRecord {
  id?: number;
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

export interface BrewRecommendation {
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
  recommendation: string;
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
  CREATE TABLE IF NOT EXISTS brews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin TEXT NOT NULL,
    roast_level TEXT NOT NULL,
    grind_size TEXT NOT NULL,
    water_temp_c INTEGER NOT NULL,
    ratio REAL NOT NULL,
    brew_time_s INTEGER NOT NULL,
    rating REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Express app
const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Coffee Brew Inference Experiment API',
    tech: 'TypeScript-anchored with Python/DSPy inference',
    endpoints: {
      'GET  /brews': 'List all brew records',
      'POST /brews': 'Add a new brew record',
      'GET  /recommend': 'Get brew recommendation (via DSPy)',
    }
  });
});

// List all brews
app.get('/brews', (_req: Request, res: Response) => {
  try {
    const stmt: Statement = db.prepare('SELECT * FROM brews ORDER BY created_at DESC');
    const brews = stmt.all();
    res.json({ count: brews.length, brews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brews', details: String(err) });
  }
});

// Add a new brew
app.post('/brews', (req: Request, res: Response) => {
  const brew: BrewRecord = req.body;
  
  // Validate required fields
  const required = ['origin', 'roast_level', 'grind_size', 'water_temp_c', 'ratio', 'brew_time_s', 'rating'];
  for (const field of required) {
    if (!(field in brew)) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  try {
    const stmt: Statement = db.prepare(`
      INSERT INTO brews (origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, rating, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      brew.origin,
      brew.roast_level,
      brew.grind_size,
      brew.water_temp_c,
      brew.ratio,
      brew.brew_time_s,
      brew.rating,
      brew.notes || null
    );
    
    res.status(201).json({ id: result.lastInsertRowid, message: 'Brew record added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add brew', details: String(err) });
  }
});

// Get recommendation (placeholder - calls Python/DSPy script)
app.get('/recommend', (req: Request, res: Response) => {
  const { origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s } = req.query;

  if (!origin || !roast_level || !grind_size || !water_temp_c || !ratio || !brew_time_s) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  // TODO: Call inference/brew_inference.py via child_process
  // For now, return a placeholder
  res.json({
    message: 'Recommendation endpoint - will call DSPy inference',
    input: { origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s },
    note: 'Python/DSPy integration coming soon'
  });
});

// ── Start server
app.listen(PORT, () => {
  console.log(`☕ Coffee Brew API running on http://localhost:${PORT}`);
  console.log(`   TypeScript entry: ${__filename}`);
  console.log(`   DB location: ${dbPath}`);
});

export default app;