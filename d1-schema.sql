-- Oxbowpalooza RSVP D1 schema
--
-- For a brand-new D1 database:
--   Run this whole file in the D1 query console.
--
-- If your database already has an rsvps table but the site broke:
--   1. Run the CREATE TABLE and CREATE INDEX statements below.
--   2. If a column is missing, run the matching ALTER TABLE statement from
--      the repair section one at a time.
--   3. If Cloudflare says "duplicate column name", that column already exists.
--      Skip it and continue with the next missing column.
--
-- Do not drop the table unless you intentionally want to erase RSVP data.

CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  nickname TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  invited_by TEXT,
  food_notes TEXT,
  days_attending TEXT,
  birth_month TEXT,
  birth_day INTEGER,
  height_inches INTEGER,
  origin_lat REAL,
  origin_lng REAL,
  miles INTEGER
);

CREATE INDEX IF NOT EXISTS idx_rsvps_miles ON rsvps(miles DESC);
CREATE INDEX IF NOT EXISTS idx_rsvps_height ON rsvps(height_inches DESC);
CREATE INDEX IF NOT EXISTS idx_rsvps_birthday ON rsvps(birth_month, birth_day);

-- Repair section for an existing rsvps table.
-- Run only the lines for columns that are missing from your table.
-- Duplicate-column errors are okay; they mean that column is already present.

-- ALTER TABLE rsvps ADD COLUMN created_at TEXT;
-- UPDATE rsvps SET created_at = datetime('now') WHERE created_at IS NULL;
-- ALTER TABLE rsvps ADD COLUMN nickname TEXT;
-- ALTER TABLE rsvps ADD COLUMN email TEXT;
-- ALTER TABLE rsvps ADD COLUMN city TEXT;
-- ALTER TABLE rsvps ADD COLUMN address TEXT;
-- ALTER TABLE rsvps ADD COLUMN invited_by TEXT;
-- ALTER TABLE rsvps ADD COLUMN food_notes TEXT;
-- ALTER TABLE rsvps ADD COLUMN days_attending TEXT;
-- ALTER TABLE rsvps ADD COLUMN birth_month TEXT;
-- ALTER TABLE rsvps ADD COLUMN birth_day INTEGER;
-- ALTER TABLE rsvps ADD COLUMN height_inches INTEGER;
-- ALTER TABLE rsvps ADD COLUMN origin_lat REAL;
-- ALTER TABLE rsvps ADD COLUMN origin_lng REAL;
-- ALTER TABLE rsvps ADD COLUMN miles INTEGER;

-- Useful checks:
-- PRAGMA table_info(rsvps);
-- SELECT * FROM rsvps ORDER BY created_at DESC LIMIT 25;
