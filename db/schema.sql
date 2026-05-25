-- Coffee brew sample database schema
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
);

-- Sample data (10+ records to be added)
