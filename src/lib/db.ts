import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import type {
  BrewingMethod, Brew, BrewWithMethod, BrewSource,
  Origin, RecommendationRecord, BrewRecommendationLink,
  FieldConfidence,
} from '../types.js';

const DB_PATH = path.join(process.cwd(), 'data', 'coffee-brew.db');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS origins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    region TEXT,
    subregion TEXT,
    aliases TEXT,
    is_verified INTEGER DEFAULT 1
  );

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
    source TEXT DEFAULT 'user_submitted',
    source_url TEXT,
    field_confidence TEXT,
    FOREIGN KEY(brewing_method_id) REFERENCES brewing_methods(id)
  );

  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brewing_method_id INTEGER,
    origin TEXT,
    roast_level TEXT,
    grind_size TEXT,
    water_temp_c INTEGER,
    ratio REAL,
    brew_time_s INTEGER,
    recommendation TEXT,
    confidence TEXT,
    confidence_breakdown TEXT,
    sources TEXT,
    fingerprint TEXT UNIQUE,
    created_at TEXT,
    FOREIGN KEY(brewing_method_id) REFERENCES brewing_methods(id)
  );

  CREATE TABLE IF NOT EXISTS brew_recommendation_links (
    brew_id INTEGER,
    recommendation_id INTEGER,
    match_confidence REAL,
    linked_at TEXT,
    PRIMARY KEY (brew_id, recommendation_id),
    FOREIGN KEY(brew_id) REFERENCES brews(id),
    FOREIGN KEY(recommendation_id) REFERENCES recommendations(id)
  );
`;

const SEED_ORIGINS: Omit<Origin, 'id'>[] = [
  { name: 'Ethiopia', region: 'Africa', subregion: 'Yirgacheffe, Sidamo, Guji, Harrar', aliases: 'Ethiopean,Ethopian', is_verified: true },
  { name: 'Colombia', region: 'South America', subregion: 'Huila, Nariño, Antioquia', aliases: 'Colombian,Columbia', is_verified: true },
  { name: 'Kenya', region: 'Africa', subregion: 'Nyeri, Kirinyaga, Muranga', aliases: 'Kenyan', is_verified: true },
  { name: 'Brazil', region: 'South America', subregion: 'Minas Gerais, São Paulo, Espírito Santo', aliases: 'Brazillian,Brasilian', is_verified: true },
  { name: 'Costa Rica', region: 'Central America', subregion: 'Tarrazú, West Valley, Central Valley', aliases: 'Costa Rican', is_verified: true },
  { name: 'Guatemala', region: 'Central America', subregion: 'Antigua, Huehuetenango, Atitlán', aliases: 'Guatamalan', is_verified: true },
  { name: 'Panama', region: 'Central America', subregion: 'Boquete, Volcán', aliases: 'Panamanian', is_verified: true },
  { name: 'Honduras', region: 'Central America', subregion: 'Copán, Marcala, Santa Bárbara', aliases: '', is_verified: true },
  { name: 'El Salvador', region: 'Central America', subregion: 'Santa Ana, Apaneca-Ilamatepec', aliases: '', is_verified: true },
  { name: 'Peru', region: 'South America', subregion: 'Cajamarca, Cusco, Junín', aliases: 'Peruvian', is_verified: true },
  { name: 'Tanzania', region: 'Africa', subregion: 'Kilimanjaro, Arusha, Mbeya', aliases: 'Tanzanian', is_verified: true },
  { name: 'Rwanda', region: 'Africa', subregion: 'Nyamasheke, Gakenke, Huye', aliases: 'Rwandan', is_verified: true },
  { name: 'Burundi', region: 'Africa', subregion: 'Kayanza, Ngozi, Muyinga', aliases: '', is_verified: true },
  { name: 'Yemen', region: 'Middle East', subregion: 'Mocha, Mattari, Hirazi', aliases: 'Yemeni', is_verified: true },
  { name: 'Indonesia', region: 'Asia Pacific', subregion: 'Sumatra, Java, Sulawesi, Bali', aliases: 'Indonesian,Sumatran', is_verified: true },
  { name: 'India', region: 'Asia Pacific', subregion: 'Karnataka, Tamil Nadu, Kerala', aliases: 'Indian', is_verified: true },
  { name: 'Vietnam', region: 'Asia Pacific', subregion: 'Central Highlands, Da Lat', aliases: 'Vietnamese', is_verified: true },
  { name: 'Mexico', region: 'Central America', subregion: 'Chiapas, Oaxaca, Veracruz', aliases: 'Mexican', is_verified: true },
  { name: 'Nicaragua', region: 'Central America', subregion: 'Jinotega, Matagalpa, Nueva Segovia', aliases: 'Nicaraguan', is_verified: true },
  { name: 'Ecuador', region: 'South America', subregion: 'Loja, Pichincha, Zamora-Chinchipe', aliases: 'Ecuadorian', is_verified: true },
];

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

const V2_COLUMNS = ['brewing_method_id', 'origin', 'roast_level', 'grind_size', 'water_temp_c', 'ratio', 'brew_time_s', 'rating', 'notes', 'created_at'];

function needsMigration(database: Database): boolean {
  const colCheck = database.prepare("PRAGMA table_info(brews)");
  const names: string[] = [];
  while (colCheck.step()) names.push(colCheck.getAsObject().name as string);
  colCheck.free();
  return !names.includes('source');
}

export async function getDB(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    if (needsMigration(db)) {
      db.run('DROP TABLE IF EXISTS brew_recommendation_links');
      db.run('DROP TABLE IF EXISTS recommendations');
      db.run('DROP TABLE IF EXISTS brews');
      db.run('DROP TABLE IF EXISTS brewing_methods');
      db.run('DROP TABLE IF EXISTS origins');
      db.run(SCHEMA);
      await seedAll();
    }
  } else {
    db = new SQL.Database();
    db.run(SCHEMA);
    await seedAll();
  }

  return db;
}

async function seedAll(): Promise<void> {
  if (!db) return;
  for (const origin of SEED_ORIGINS) {
    db.run(
      'INSERT INTO origins (name, region, subregion, aliases, is_verified) VALUES (?, ?, ?, ?, ?)',
      [origin.name, origin.region, origin.subregion || '', origin.aliases || '', origin.is_verified ? 1 : 0],
    );
  }
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

// ── Origins ─────────────────────────────────────────────

export async function getOrigins(): Promise<Origin[]> {
  const database = await getDB();
  const stmt = database.prepare('SELECT * FROM origins ORDER BY name');
  const results: Origin[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id as number,
      name: row.name as string,
      region: row.region as string,
      subregion: (row.subregion as string) || undefined,
      aliases: (row.aliases as string) || undefined,
      is_verified: !!(row.is_verified as number),
    });
  }
  stmt.free();
  return results;
}

export async function searchOrigins(query: string): Promise<Origin[]> {
  const database = await getDB();
  const origins = await getOrigins();
  const q = query.toLowerCase().trim();
  return origins.filter(o =>
    o.name.toLowerCase().includes(q) ||
    (o.aliases || '').toLowerCase().includes(q) ||
    (o.subregion || '').toLowerCase().includes(q),
  );
}

// ── Brewing Methods ─────────────────────────────────────

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

// ── Brews ────────────────────────────────────────────────

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

  if (filters?.origin) { sql += ' AND b.origin = ?'; params.push(filters.origin); }
  if (filters?.method !== undefined) { sql += ' AND b.brewing_method_id = ?'; params.push(filters.method); }

  sql += ' ORDER BY b.created_at DESC';
  if (filters?.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }

  const stmt = database.prepare(sql);
  if (params.length > 0) {
    const flatParams: (string | number)[] = params.map((p) => (typeof p === 'number' ? p : (p as string)));
    stmt.bind(flatParams as unknown as Parameters<typeof stmt.bind>[0]);
  }

  const brews: BrewWithMethod[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    brews.push({
      id: row.id as number,
      brewing_method_id: row.brewing_method_id as number,
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
      source: (row.source as BrewSource) || 'user_submitted',
      source_url: (row.source_url as string) || undefined,
      field_confidence: (row.field_confidence as string) || undefined,
    });
  }
  stmt.free();

  let countSql = 'SELECT COUNT(*) AS cnt FROM brews b WHERE 1=1';
  const countParams: unknown[] = [];
  if (filters?.origin) { countSql += ' AND b.origin = ?'; countParams.push(filters.origin); }
  if (filters?.method !== undefined) { countSql += ' AND b.brewing_method_id = ?'; countParams.push(filters.method); }
  const countStmt = database.prepare(countSql);
  if (countParams.length > 0) {
    const flatCountParams: (string | number)[] = countParams.map((p) => (typeof p === 'number' ? p : (p as string)));
    countStmt.bind(flatCountParams as unknown as Parameters<typeof countStmt.bind>[0]);
  }
  let count = 0;
  if (countStmt.step()) count = countStmt.getAsObject().cnt as number;
  countStmt.free();

  return { count, brews };
}

export async function getBrewById(id: number): Promise<Brew | null> {
  const database = await getDB();
  const stmt = database.prepare('SELECT * FROM brews WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
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
    source: (row.source as BrewSource) || 'user_submitted',
    source_url: (row.source_url as string) || undefined,
    field_confidence: (row.field_confidence as string) || undefined,
  };
}

export async function addBrew(brew: Omit<Brew, 'id' | 'created_at'> & { source?: BrewSource; source_url?: string; field_confidence?: string }): Promise<Brew> {
  const database = await getDB();
  const created_at = new Date().toISOString();
  const source = brew.source || 'user_submitted';
  database.run(
    'INSERT INTO brews (brewing_method_id, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, rating, notes, created_at, source, source_url, field_confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [brew.brewing_method_id, brew.origin, brew.roast_level, brew.grind_size, brew.water_temp_c, brew.ratio, brew.brew_time_s, brew.rating, brew.notes || '', created_at, source, brew.source_url || '', brew.field_confidence || ''],
  );

  const idStmt = database.prepare('SELECT last_insert_rowid() AS id');
  let id = 0;
  if (idStmt.step()) id = idStmt.getAsObject().id as number;
  idStmt.free();

  await saveDB();
  return { ...brew, id, created_at, source };
}

// ── Recommendations ─────────────────────────────────────

export async function createRecommendation(rec: Omit<RecommendationRecord, 'id' | 'created_at' | 'fingerprint'>): Promise<RecommendationRecord> {
  const database = await getDB();
  const created_at = new Date().toISOString();
  const fingerprint = `${(rec.origin || 'unknown').toLowerCase()}-${(rec.roast_level || 'unknown').toLowerCase()}-${rec.brewing_method_id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  database.run(
    'INSERT INTO recommendations (brewing_method_id, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, recommendation, confidence, confidence_breakdown, sources, fingerprint, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [rec.brewing_method_id, rec.origin, rec.roast_level, rec.grind_size, rec.water_temp_c, rec.ratio, rec.brew_time_s, rec.recommendation, rec.confidence, rec.confidence_breakdown || '', rec.sources || '', fingerprint, created_at],
  );

  const idStmt = database.prepare('SELECT last_insert_rowid() AS id');
  let id = 0;
  if (idStmt.step()) id = idStmt.getAsObject().id as number;
  idStmt.free();

  await saveDB();
  return { ...rec, id, fingerprint, created_at };
}

export async function getRecommendation(id: number): Promise<RecommendationRecord | null> {
  const database = await getDB();
  const stmt = database.prepare('SELECT * FROM recommendations WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
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
    recommendation: row.recommendation as string,
    confidence: row.confidence as string,
    confidence_breakdown: (row.confidence_breakdown as string) || undefined,
    sources: (row.sources as string) || undefined,
    fingerprint: row.fingerprint as string,
    created_at: row.created_at as string,
  };
}

export async function findRecentRecommendation(params: {
  origin?: string;
  brewing_method_id?: number;
  roast_level?: string;
  withinSeconds?: number;
}): Promise<RecommendationRecord | null> {
  const database = await getDB();
  const since = new Date(Date.now() - (params.withinSeconds || 604800) * 1000).toISOString(); // default 7 days
  const stmt = database.prepare(
    'SELECT * FROM recommendations WHERE origin = ? AND brewing_method_id = ? AND roast_level = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1',
  );
  stmt.bind([params.origin || '', params.brewing_method_id || 0, params.roast_level || '', since]);
  if (!stmt.step()) { stmt.free(); return null; }
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
    recommendation: row.recommendation as string,
    confidence: row.confidence as string,
    confidence_breakdown: (row.confidence_breakdown as string) || undefined,
    sources: (row.sources as string) || undefined,
    fingerprint: row.fingerprint as string,
    created_at: row.created_at as string,
  };
}

// ── Brew ↔ Recommendation Links (implicit) ──────────────

export async function linkBrewToRecommendation(brewId: number, recommendationId: number, matchConfidence: number): Promise<BrewRecommendationLink> {
  const database = await getDB();
  const linked_at = new Date().toISOString();
  database.run(
    'INSERT OR REPLACE INTO brew_recommendation_links (brew_id, recommendation_id, match_confidence, linked_at) VALUES (?, ?, ?, ?)',
    [brewId, recommendationId, matchConfidence, linked_at],
  );
  await saveDB();
  return { brew_id: brewId, recommendation_id: recommendationId, match_confidence: matchConfidence, linked_at };
}

export async function getBrewLinks(brewId: number): Promise<BrewRecommendationLink[]> {
  const database = await getDB();
  const stmt = database.prepare('SELECT * FROM brew_recommendation_links WHERE brew_id = ?');
  stmt.bind([brewId]);
  const results: BrewRecommendationLink[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      brew_id: row.brew_id as number,
      recommendation_id: row.recommendation_id as number,
      match_confidence: row.match_confidence as number,
      linked_at: row.linked_at as string,
    });
  }
  stmt.free();
  return results;
}