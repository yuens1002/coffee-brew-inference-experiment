import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import type { BrewingMethod, Brew, BrewWithMethod } from '../types.js';

const DB_PATH = path.join(process.cwd(), 'data', 'coffee-brew.db');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS brewing_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    default_temp_c INTEGER,
    grind_size TEXT,
    default_brew_time_s INTEGER,
    default_ratio REAL
  );

  CREATE TABLE IF NOT EXISTS brews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brewing_method_id INTEGER,
    origin TEXT,
    roast_level TEXT,
    grind_size TEXT,
    water_temp_c INTEGER,
    ratio REAL,
    brew_time_s INTEGER,
    rating INTEGER,
    notes TEXT,
    created_at TEXT,
    FOREIGN KEY(brewing_method_id) REFERENCES brewing_methods(id)
  );
`;

const SEED_METHODS: Omit<BrewingMethod, 'id'>[] = [
  { name: 'Pour Over', description: 'Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)', default_temp_c: 93, grind_size: 'medium-fine', default_brew_time_s: 210, default_ratio: 0.0625 },
  { name: 'French Press', description: 'Immersion brewing with a metal mesh filter', default_temp_c: 96, grind_size: 'coarse', default_brew_time_s: 240, default_ratio: 0.0667 },
  { name: 'Aeropress', description: 'Rapid immersion + pressure extraction', default_temp_c: 85, grind_size: 'medium-fine', default_brew_time_s: 120, default_ratio: 0.0667 },
  { name: 'Espresso', description: 'High-pressure extraction through finely ground coffee', default_temp_c: 92, grind_size: 'fine', default_brew_time_s: 30, default_ratio: 0.5 },
  { name: 'Cold Brew', description: 'Long cold steep for smooth, low-acid coffee', default_temp_c: 20, grind_size: 'coarse', default_brew_time_s: 43200, default_ratio: 0.125 },
  { name: 'Moka Pot', description: 'Stovetop pressure brewing', default_temp_c: 90, grind_size: 'fine', default_brew_time_s: 300, default_ratio: 0.1429 },
  { name: 'Siphon', description: 'Vacuum-driven immersion brewing', default_temp_c: 93, grind_size: 'medium', default_brew_time_s: 90, default_ratio: 0.0667 },
  { name: 'Turkish', description: 'Very fine grind boiled in a cezve/ibrik', default_temp_c: 100, grind_size: 'extra-fine', default_brew_time_s: 180, default_ratio: 0.1 },
];

let db: Database | null = null;

export async function getDB(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    // Detect v1 schema (old table with water_temp column) and migrate
    const colCheck = db.prepare("PRAGMA table_info(brewing_methods)");
    const hasWaterTemp = colCheck.step() && colCheck.getAsObject().name === 'water_temp';
    colCheck.free();
    if (hasWaterTemp) {
      db.run('DROP TABLE IF EXISTS brewing_methods');
      db.run('DROP TABLE IF EXISTS brews');
      db.run(SCHEMA);
      fs.unlinkSync(DB_PATH); // force re-seed on next boot
      db = new SQL.Database();
      db.run(SCHEMA);
      await seedBrewingMethods();
    }
  } else {
    db = new SQL.Database();
    db.run(SCHEMA);
    await seedBrewingMethods();
  }

  return db;
}

async function seedBrewingMethods(): Promise<void> {
  if (!db) return;
  for (const method of SEED_METHODS) {
    db.run(
      'INSERT INTO brewing_methods (name, description, default_temp_c, grind_size, default_brew_time_s, default_ratio) VALUES (?, ?, ?, ?, ?, ?)',
      [method.name, method.description, method.default_temp_c, method.grind_size, method.default_brew_time_s, method.default_ratio],
    );
  }
  await saveDB();
}

export async function saveDB(): Promise<void> {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

export async function getBrewingMethods(): Promise<BrewingMethod[]> {
  const database = await getDB();
  const stmt = database.prepare('SELECT * FROM brewing_methods');
  const results: BrewingMethod[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id as number,
      name: row.name as string,
      description: row.description as string,
      default_ratio: row.default_ratio as number,
      default_temp_c: row.default_temp_c as number,
      default_brew_time_s: row.default_brew_time_s as number,
      grind_size: row.grind_size as string,
    });
  }
  stmt.free();
  return results;
}

export async function getBrews(filters?: {
  origin?: string;
  method?: number;
  limit?: number;
}): Promise<{ count: number; brews: BrewWithMethod[] }> {
  const database = await getDB();
  let sql = `
    SELECT b.*, bm.name AS brewing_method
    FROM brews b
    JOIN brewing_methods bm ON b.brewing_method_id = bm.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (filters?.origin) {
    sql += ' AND b.origin = ?';
    params.push(filters.origin);
  }
  if (filters?.method !== undefined) {
    sql += ' AND b.brewing_method_id = ?';
    params.push(filters.method);
  }

  sql += ' ORDER BY b.created_at DESC';

  if (filters?.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  // Bind all params at once; sql.js bind accepts [param1, param2, ...]
  const stmt = database.prepare(sql);
  if (params.length > 0) {
    const flatParams: (string | number)[] = params.map((p) =>
      typeof p === 'number' ? p : (p as string),
    );
    stmt.bind(flatParams as unknown as Parameters<typeof stmt.bind>[0]);
  }

  const brews: BrewWithMethod[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    brews.push({
      id: row.id as number,
      brewing_method: row.brewing_method as string,
      origin: row.origin as string,
      roast_level: row.roast_level as string,
      grind_size: row.grind_size as string,
      water_temp_c: row.water_temp_c as number,
      ratio: row.ratio as number,
      brew_time_s: row.brew_time_s as number,
      rating: row.rating as number,
      notes: (row.notes as string) || undefined,
      created_at: row.created_at as string,
    });
  }
  stmt.free();

  // Count with same filters
  let countSql = 'SELECT COUNT(*) AS cnt FROM brews b WHERE 1=1';
  const countParams: unknown[] = [];
  if (filters?.origin) {
    countSql += ' AND b.origin = ?';
    countParams.push(filters.origin);
  }
  if (filters?.method !== undefined) {
    countSql += ' AND b.brewing_method_id = ?';
    countParams.push(filters.method);
  }
  const countStmt = database.prepare(countSql);
  if (countParams.length > 0) {
    const flatCountParams: (string | number)[] = countParams.map((p) =>
      typeof p === 'number' ? p : (p as string),
    );
    countStmt.bind(flatCountParams as unknown as Parameters<typeof countStmt.bind>[0]);
  }
  let count = 0;
  if (countStmt.step()) {
    count = countStmt.getAsObject().cnt as number;
  }
  countStmt.free();

  return { count, brews };
}

export async function getBrewById(id: number): Promise<Brew | null> {
  const database = await getDB();
  const stmt = database.prepare('SELECT * FROM brews WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject();
  stmt.free();
  return {
    id: row.id as number,
    brewing_method_id: row.brewing_method_id as number,
    origin: row.origin as string,
    roast_level: row.roast_level as string,
    grind_size: row.grind_size as string,
    water_temp_c: row.water_temp_c as number,
    ratio: row.ratio as number,
    brew_time_s: row.brew_time_s as number,
    rating: row.rating as number,
    notes: (row.notes as string) || undefined,
    created_at: row.created_at as string,
  };
}

export async function addBrew(brew: Omit<Brew, 'id' | 'created_at'>): Promise<Brew> {
  const database = await getDB();
  const created_at = new Date().toISOString();
  database.run(
    'INSERT INTO brews (brewing_method_id, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, rating, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [brew.brewing_method_id, brew.origin, brew.roast_level, brew.grind_size, brew.water_temp_c, brew.ratio, brew.brew_time_s, brew.rating, brew.notes || '', created_at],
  );

  // Get the last inserted row id
  const idStmt = database.prepare('SELECT last_insert_rowid() AS id');
  let id = 0;
  if (idStmt.step()) {
    id = idStmt.getAsObject().id as number;
  }
  idStmt.free();

  await saveDB();
  return { ...brew, id, created_at };
}
