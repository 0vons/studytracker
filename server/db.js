const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "database.sqlite"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    weekly_goal REAL    NOT NULL DEFAULT 0,
    timezone    TEXT    NOT NULL DEFAULT 'Europe/Istanbul',
    avatar      TEXT,
    bio         TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_jti  TEXT    NOT NULL UNIQUE,
    user_agent TEXT,
    ip         TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS study_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       TEXT    NOT NULL,
    hours      REAL    NOT NULL CHECK(hours >= 0 AND hours <= 24),
    subject    TEXT,
    notes      TEXT,
    mood       INTEGER CHECK(mood BETWEEN 1 AND 5),
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    tags       TEXT,
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    target_date TEXT    NOT NULL,
    target_hours REAL   NOT NULL,
    color       TEXT    NOT NULL DEFAULT '#4f46e5',
    description TEXT,
    completed   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration   INTEGER NOT NULL,
    type       TEXT    NOT NULL DEFAULT 'work',
    subject    TEXT,
    completed  INTEGER NOT NULL DEFAULT 0,
    started_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_pomodoro_user ON pomodoro_sessions(user_id);

  CREATE TABLE IF NOT EXISTS streaks (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    longest_streak  INTEGER NOT NULL DEFAULT 0,
    last_study_date TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_logs_user_date ON study_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_goals_user     ON goals(user_id);
`);

module.exports = db;
