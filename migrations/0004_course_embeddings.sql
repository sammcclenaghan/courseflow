PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS course_embeddings (
  course_pid TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding_json TEXT NOT NULL CHECK (json_valid(embedding_json)),
  input_hash TEXT NOT NULL,
  embedded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (course_pid) REFERENCES courses(pid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_course_embeddings_model ON course_embeddings(model);
CREATE INDEX IF NOT EXISTS idx_course_embeddings_input_hash ON course_embeddings(input_hash);

CREATE TABLE IF NOT EXISTS course_recommendations (
  source_pid TEXT NOT NULL,
  related_pid TEXT NOT NULL,
  model TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  semantic_score REAL NOT NULL,
  lexical_score REAL NOT NULL DEFAULT 0,
  prereq_score REAL NOT NULL DEFAULT 0,
  level_score REAL NOT NULL DEFAULT 0,
  discovery_score REAL NOT NULL DEFAULT 0,
  final_score REAL NOT NULL,
  reasons_json TEXT NOT NULL CHECK (json_valid(reasons_json)),
  recommendation_rank INTEGER NOT NULL,
  computed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (source_pid, related_pid, algorithm_version),
  FOREIGN KEY (source_pid) REFERENCES courses(pid) ON DELETE CASCADE,
  FOREIGN KEY (related_pid) REFERENCES courses(pid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_course_recommendations_source_rank
  ON course_recommendations(source_pid, algorithm_version, recommendation_rank);
CREATE INDEX IF NOT EXISTS idx_course_recommendations_related
  ON course_recommendations(related_pid);
