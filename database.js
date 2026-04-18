/* ═══════════════════════════════════════════════════════
   database.js — SQLite setup matching the ERD
   Tables: Trainer, Member, Exercise, WorkoutPlan,
           Progress Log, Payment + junction tables
   ═══════════════════════════════════════════════════════ */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'fittrack.db'));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create Tables ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    phone     TEXT DEFAULT '',
    email     TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    role      TEXT NOT NULL DEFAULT 'member',
    joinDate  TEXT DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    phone     TEXT DEFAULT '',
    email     TEXT DEFAULT '',
    joinDate  TEXT DEFAULT (date('now')),
    trainerId INTEGER REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS trainers (
    id             INTEGER PRIMARY KEY,
    name           TEXT NOT NULL,
    phone          TEXT DEFAULT '',
    specialization TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    muscle    TEXT DEFAULT '',
    equipment TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS workout_plans (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    goal       TEXT NOT NULL,
    difficulty TEXT DEFAULT 'Beginner',
    duration   INTEGER DEFAULT 0,
    trainerId  INTEGER REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS plan_exercises (
    planId     INTEGER REFERENCES workout_plans(id) ON DELETE CASCADE,
    exerciseId INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    PRIMARY KEY (planId, exerciseId)
  );

  CREATE TABLE IF NOT EXISTS member_plans (
    memberId  INTEGER REFERENCES users(id) ON DELETE CASCADE,
    planId    INTEGER REFERENCES workout_plans(id) ON DELETE CASCADE,
    PRIMARY KEY (memberId, planId)
  );

  CREATE TABLE IF NOT EXISTS progress_logs (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    memberId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date     TEXT DEFAULT (date('now')),
    weight   REAL DEFAULT 0,
    bodyFat  REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS payments (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    memberId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount   REAL NOT NULL,
    method   TEXT DEFAULT ''
  );
`);

// ── Seed default admin if no users exist ─────────────
const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
if (userCount.cnt === 0) {
  const insertUser = db.prepare(
    'INSERT INTO users (name, phone, email, password, role) VALUES (?, ?, ?, ?, ?)'
  );
  insertUser.run('Admin User', '', 'admin@fittrack.com', 'admin123', 'admin');
  console.log('✓ Default admin seeded: admin@fittrack.com / admin123');
}

module.exports = db;
