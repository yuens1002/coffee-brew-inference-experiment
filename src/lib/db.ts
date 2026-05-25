import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import type { BrewingMethod, Brew } from '../types.js';

const DB_PATH = path.join(process.cwd(), 'data', 'coffee-brew.db');
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS brewing_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    water_temp INTEGER,
    grind_size TEXT,
    brew_time INTEGER,
    ratio TEXT
  );

  CREATE TABLE IF NOT EXISTS brews (
    id TEXT PRIMARY KEY,
    method_id TEXT,
    coffee_name TEXT,
    grind_setting TEXT,
    water_temp INTEGER,
    brew_time INTEGER,
    rating INTEGER,
    notes TEXT,
    timestamp TEXT,
    FOREIGN KEY(method_id) REFERENCES brewing_methods(id)
  );
`;

const SEED_METHODS: Omit<BrewingMethod, 'id'>[] = [
  { name: 'Pour Over', description: 'Manual pour over method', waterTemp: 93, grindSize: 'Medium-Fine', brewTime: 180, ratio: '1:16' },
  { name: 'French Press', description: 'Immersion brewing', waterTemp: 96, grindSize: 'Coarse', brewTime: 240, ratio: '1:15' },
  { name: 'Aeropress', description: 'Rapid immersion + pressure', waterTemp: 85, grindSize: 'Medium-Fine', brewTime: 120, ratio: '1:15' },
  { name: 'Espresso', description: 'High pressure extraction', waterTemp: 92, grindSize: 'Fine', brewTime: 30, ratio: '1:2' },
  { name: 'Cold Brew', description: 'Long cold steep', waterTemp: 20, grindSize: 'Coarse', brewTime: 43200, ratio: '1:8' },
  { name: 'Moka Pot', description: 'Stovetop pressure', waterTemp: 90, grindSize: 'Fine', brewTime: 300, ratio: '1:7' },
  { name: 'Siphon', description: 'Vacuum immersion', waterTemp: 93, grindSize: 'Medium', brewTime: 90, ratio: '1:15' },
  { name: 'Turkish', description: 'Very fine grind, boiled', waterTemp: 100, grindSize: 'Extra Fine', brewTime: 180, ratio: '1:10' },
];

let db: Database | null = null;

export async function getDB(): Promise<Database> {
  if (db) return db;
  
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`
  });
  
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    db.run(SCHEMA);
    await seedBrewingMethods();
  }
  
  return db;
}

async function seedBrewingMethods() {
  if (!db) return;
  for (const method of SEED_METHODS) {
    const id = crypto.randomUUID();
    db.run(
      'INSERT INTO brewing_methods (id, name, description, water_temp, grind_size, brew_time, ratio) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, method.name, method.description, method.waterTemp, method.grindSize, method.brewTime, method.ratio]
    );
  }
  await saveDB();
}

export async function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

export async function getBrewingMethods(): Promise<BrewingMethod[]> {
  const db = await getDB();
  const stmt = db.prepare('SELECT * FROM brewing_methods');
  const results: BrewingMethod[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      waterTemp: row.water_temp as number,
      grindSize: row.grind_size as string,
      brewTime: row.brew_time as number,
      ratio: row.ratio as string
    });
  }
  stmt.free();
  return results;
}

export async function addBrew(brew: Omit<Brew, 'id' | 'timestamp'>): Promise<Brew> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const newBrew: Brew = { ...brew, id, timestamp };  
  db.run(
    'INSERT INTO brews (id, method_id, coffee_name, grind_setting, water_temp, brew_time, rating, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, brew.methodId, brew.coffeeName, brew.grindSetting, brew.waterTemp, brew.brewTime, brew.rating, brew.notes || '', timestamp]
  );  
  await saveDB();
  return newBrew;
}
