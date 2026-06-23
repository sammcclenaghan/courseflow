PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pid TEXT NOT NULL UNIQUE,
  subject_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  credits TEXT NOT NULL DEFAULT '',
  hours_catalog_text TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL,
  pre_and_corequisites TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_courses_subject_code ON courses(subject_code);
CREATE INDEX IF NOT EXISTS idx_courses_pid ON courses(pid);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,
  crn TEXT NOT NULL,
  course_pid TEXT,
  subject TEXT NOT NULL,
  course_number TEXT NOT NULL,
  course_name TEXT NOT NULL,
  section TEXT NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT '',
  instructional_method TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  days TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  date_range TEXT NOT NULL DEFAULT '',
  units TEXT NOT NULL DEFAULT '',
  additional_information TEXT NOT NULL,
  enrollment_actual INTEGER NOT NULL DEFAULT 0,
  enrollment_maximum INTEGER NOT NULL DEFAULT 0,
  enrollment_seats_available INTEGER NOT NULL DEFAULT 0,
  waitlist_capacity INTEGER NOT NULL DEFAULT 0,
  waitlist_actual INTEGER NOT NULL DEFAULT 0,
  waitlist_seats_available INTEGER NOT NULL DEFAULT 0,
  meetings TEXT CHECK (meetings IS NULL OR json_valid(meetings)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  UNIQUE(term, crn),
  FOREIGN KEY (course_pid) REFERENCES courses(pid) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sections_course_pid ON sections(course_pid);
CREATE INDEX IF NOT EXISTS idx_sections_subject_number ON sections(subject, course_number);
CREATE INDEX IF NOT EXISTS idx_sections_term_course_pid ON sections(term, course_pid);
