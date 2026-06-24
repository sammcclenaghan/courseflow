PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  term TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  UNIQUE(token, term)
);

CREATE INDEX IF NOT EXISTS idx_schedules_token ON schedules(token);

CREATE TABLE IF NOT EXISTS schedule_sections (
  schedule_id INTEGER NOT NULL,
  term TEXT NOT NULL,
  crn TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  PRIMARY KEY (schedule_id, term, crn),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (term, crn) REFERENCES sections(term, crn) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedule_sections_term_crn ON schedule_sections(term, crn);

CREATE TABLE IF NOT EXISTS course_connections (
  source_pid TEXT NOT NULL,
  target_pid TEXT NOT NULL,
  position INTEGER NOT NULL,
  score REAL NOT NULL,
  is_cross_subject INTEGER NOT NULL DEFAULT 0 CHECK (is_cross_subject IN (0, 1)),
  reasons TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  PRIMARY KEY (source_pid, target_pid),
  FOREIGN KEY (source_pid) REFERENCES courses(pid) ON DELETE CASCADE,
  FOREIGN KEY (target_pid) REFERENCES courses(pid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_course_connections_source_position
  ON course_connections(source_pid, position);
