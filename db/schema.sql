-- Coffee brew sample database schema (UPDATED with brewing methods)

-- Brewing methods lookup table
CREATE TABLE IF NOT EXISTS brewing_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    default_ratio REAL,  -- coffee:water ratio (e.g., 1:16 = 0.0625)
    default_temp_c INTEGER,
    default_brew_time_s INTEGER,
    grind_size TEXT  -- recommended grind size
);

-- Main brews table
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

-- Sample brewing methods
INSERT OR IGNORE INTO brewing_methods (name, description, default_ratio, default_temp_c, default_brew_time_s, grind_size) VALUES
    ('Pour Over', 'Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)', 0.0625, 93, 210, 'medium-fine'),
    ('French Press', 'Coffee steeped in hot water, separated by metal mesh filter', 0.0588, 96, 240, 'coarse'),
    ('Espresso', 'High-pressure water forced through finely-ground coffee', 0.125, 93, 30, 'fine'),
    ('AeroPress', 'Immersion and pressure brewing with paper filter', 0.0714, 90, 90, 'medium-fine'),
    ('Cold Brew', 'Coffee steeped in cold water for extended period', 0.125, 20, 43200, 'coarse'),  -- 12 hours
    ('Moka Pot', 'Stovetop brewing using steam pressure', 0.0833, 90, 300, 'medium'),  -- 5 minutes
    ('Siphon', 'Vacuum brewing with cloth filter', 0.0625, 93, 180, 'medium-fine'),
    ('Turkish/Ibrik', 'Finely ground coffee simmered in water with sugar', 0.1111, 95, 180, 'extra-fine');

-- Sample brew records (updated with brewing_method_id)
-- These will be inserted after brewing_methods has data
