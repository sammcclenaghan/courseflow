PRAGMA foreign_keys = ON;

ALTER TABLE schedule_sections
ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS schedule_shares (
  share_id TEXT PRIMARY KEY,
  schedule_id INTEGER NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedule_shares_schedule_id
  ON schedule_shares(schedule_id);
