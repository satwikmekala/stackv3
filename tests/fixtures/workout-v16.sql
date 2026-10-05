-- Schema v16, before exercise measurement metrics and duration storage.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  workout_type TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  secondary_muscle TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0,
  equipment TEXT,
  load_type TEXT NOT NULL DEFAULT 'external_weight'
    CHECK (load_type IN ('external_weight', 'bodyweight'))
);

CREATE TABLE IF NOT EXISTS custom_splits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_split_workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  split_id INTEGER NOT NULL REFERENCES custom_splits(id),
  name TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_split_workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES custom_split_workouts(id),
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS split_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_type TEXT NOT NULL,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  target_reps INTEGER NOT NULL,
  target_weight REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS archetype_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  archetype TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'a',
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  target_reps INTEGER NOT NULL,
  target_weight REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  archetype TEXT DEFAULT NULL,
  secondary_archetype TEXT DEFAULT NULL,
  archetype_variant TEXT DEFAULT NULL,
  secondary_archetype_variant TEXT DEFAULT NULL,
  intensity TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT DEFAULT NULL,
  retroactive INTEGER NOT NULL DEFAULT 0,
  -- Source metadata for sessions started from a saved Custom Split. Kept
  -- without foreign keys on purpose: training history must survive a split
  -- (or one of its workouts) being edited or deleted later.
  custom_split_id INTEGER DEFAULT NULL,
  custom_split_workout_id INTEGER DEFAULT NULL,
  focus_session_exercise_id INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS session_workout_types (
  session_id INTEGER NOT NULL,
  workout_type TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (session_id, position),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  entry_unit TEXT NOT NULL DEFAULT 'kg' CHECK (entry_unit IN ('kg', 'lbs'))
);

CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_exercise_id INTEGER NOT NULL REFERENCES session_exercises(id),
  set_index INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight REAL NOT NULL,
  target_reps INTEGER,
  target_weight REAL,
  completed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  bonus_type TEXT,
  value_origin TEXT NOT NULL DEFAULT 'user' CHECK (value_origin IN ('template', 'history', 'propagated', 'user'))
);

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  weekly_goal INTEGER NOT NULL DEFAULT 3,
  experience_level TEXT NOT NULL DEFAULT 'intermediate',
  training_days TEXT NOT NULL DEFAULT '[]',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  auto_increase_weight INTEGER NOT NULL DEFAULT 1,
  weight_increment REAL NOT NULL DEFAULT 0.5,
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  weight_increment_lbs REAL NOT NULL DEFAULT 5,
  active_split_id INTEGER REFERENCES custom_splits(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_one_in_progress
  ON sessions(completed) WHERE completed = 0;
CREATE INDEX IF NOT EXISTS split_templates_type_position
  ON split_templates(workout_type, position);
CREATE INDEX IF NOT EXISTS archetype_templates_archetype_position
  ON archetype_templates(archetype, position);
CREATE INDEX IF NOT EXISTS session_workout_types_type_session
  ON session_workout_types(workout_type, session_id);
CREATE INDEX IF NOT EXISTS session_exercises_session_position
  ON session_exercises(session_id, position);
CREATE INDEX IF NOT EXISTS sets_exercise_index
  ON sets(session_exercise_id, set_index);
CREATE INDEX IF NOT EXISTS custom_split_workouts_split_position
  ON custom_split_workouts(split_id, position);
CREATE INDEX IF NOT EXISTS custom_split_workout_exercises_workout_position
  ON custom_split_workout_exercises(workout_id, position);

PRAGMA user_version = 16;
