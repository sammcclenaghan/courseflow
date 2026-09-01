PRAGMA foreign_keys = ON;

-- Non-null means the six enrollment/waitlist counts came from a successful
-- Banner enrollment fetch at that time. Null means the counts are import
-- defaults and must not be presented as current. No backfill: provenance of
-- existing rows is unknown.
ALTER TABLE sections ADD COLUMN enrollment_updated_at TEXT;
