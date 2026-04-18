const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── HELPERS ──────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const safe = (u) => { if (!u) return null; const { password, ...s } = u; return s; };

// ═══════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════

// POST /api/login
app.post('/api/login', (req, res) => {
  const { email, password, role } = req.body;
  const user = db.prepare(
    'SELECT * FROM users WHERE email=? AND password=? AND role=?'
  ).get(email, password, role);
  if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
  res.json({ success: true, user: safe(user) });
});

// POST /api/register
app.post('/api/register', (req, res) => {
  const { name, phone = '', email, password, role = 'member' } = req.body;
  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (exists) return res.status(409).json({ success: false, error: 'Email already registered' });

  const result = db.prepare(
    'INSERT INTO users (name, phone, email, password, role, joinDate) VALUES (?,?,?,?,?,?)'
  ).run(name, phone, email, password, role, today());

  const userId = result.lastInsertRowid;

  if (role === 'member') {
    db.prepare(
      'INSERT OR IGNORE INTO members (id, name, phone, email, joinDate) VALUES (?,?,?,?,?)'
    ).run(userId, name, phone, email, today());
  } else if (role === 'trainer') {
    db.prepare(
      'INSERT OR IGNORE INTO trainers (id, name, phone) VALUES (?,?,?)'
    ).run(userId, name, phone);
  }

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  res.json({ success: true, user: safe(user) });
});

// GET /api/user/:id
app.get('/api/user/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(Number(req.params.id));
  res.json(safe(user));
});

// PUT /api/user/:id
app.put('/api/user/:id', (req, res) => {
  const { name, email, phone } = req.body;
  const id = Number(req.params.id);
  db.prepare('UPDATE users SET name=?, email=?, phone=? WHERE id=?').run(name, email, phone, id);
  db.prepare('UPDATE members SET name=?, email=?, phone=? WHERE id=?').run(name, email, phone, id);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  res.json({ success: true, user: safe(user) });
});

// PUT /api/user/:id/password
app.put('/api/user/:id/password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const id = Number(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (!user || user.password !== oldPassword)
    return res.status(401).json({ success: false, error: 'Wrong current password' });
  db.prepare('UPDATE users SET password=? WHERE id=?').run(newPassword, id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
//  MEMBERS
// ═══════════════════════════════════════════════════════

app.get('/api/members', (req, res) => {
  res.json(db.prepare('SELECT * FROM members').all());
});

app.get('/api/members/:id', (req, res) => {
  res.json(db.prepare('SELECT * FROM members WHERE id=?').get(Number(req.params.id)));
});

app.post('/api/members', (req, res) => {
  const { name, phone = '', email = '', trainerId = null } = req.body;
  const r = db.prepare(
    'INSERT INTO members (name, phone, email, joinDate, trainerId) VALUES (?,?,?,?,?)'
  ).run(name, phone, email, today(), trainerId);
  res.json(db.prepare('SELECT * FROM members WHERE id=?').get(r.lastInsertRowid));
});

app.put('/api/members/:id', (req, res) => {
  const { name, phone = '', email = '', trainerId = null } = req.body;
  const id = Number(req.params.id);
  db.prepare('UPDATE members SET name=?, phone=?, email=?, trainerId=? WHERE id=?')
    .run(name, phone, email, trainerId, id);
  res.json(db.prepare('SELECT * FROM members WHERE id=?').get(id));
});

app.delete('/api/members/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id=?').run(Number(req.params.id));
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
//  TRAINERS
// ═══════════════════════════════════════════════════════

app.get('/api/trainers', (req, res) => {
  res.json(db.prepare('SELECT * FROM trainers').all());
});

app.get('/api/trainers/:id', (req, res) => {
  res.json(db.prepare('SELECT * FROM trainers WHERE id=?').get(Number(req.params.id)));
});

app.post('/api/trainers', (req, res) => {
  const { name, phone = '', specialization = '' } = req.body;
  const r = db.prepare('INSERT INTO trainers (name, phone, specialization) VALUES (?,?,?)')
    .run(name, phone, specialization);
  res.json(db.prepare('SELECT * FROM trainers WHERE id=?').get(r.lastInsertRowid));
});

app.put('/api/trainers/:id', (req, res) => {
  const { name, phone = '', specialization = '' } = req.body;
  const id = Number(req.params.id);
  db.prepare('UPDATE trainers SET name=?, phone=?, specialization=? WHERE id=?')
    .run(name, phone, specialization, id);
  res.json(db.prepare('SELECT * FROM trainers WHERE id=?').get(id));
});

app.delete('/api/trainers/:id', (req, res) => {
  db.prepare('DELETE FROM trainers WHERE id=?').run(Number(req.params.id));
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
//  EXERCISES
// ═══════════════════════════════════════════════════════

app.get('/api/exercises', (req, res) => {
  res.json(db.prepare('SELECT * FROM exercises').all());
});

app.post('/api/exercises', (req, res) => {
  const { name, muscle = '', equipment = '' } = req.body;
  const r = db.prepare('INSERT INTO exercises (name, muscle, equipment) VALUES (?,?,?)')
    .run(name, muscle, equipment);
  res.json(db.prepare('SELECT * FROM exercises WHERE id=?').get(r.lastInsertRowid));
});

app.put('/api/exercises/:id', (req, res) => {
  const { name, muscle = '', equipment = '' } = req.body;
  const id = Number(req.params.id);
  db.prepare('UPDATE exercises SET name=?, muscle=?, equipment=? WHERE id=?')
    .run(name, muscle, equipment, id);
  res.json(db.prepare('SELECT * FROM exercises WHERE id=?').get(id));
});

app.delete('/api/exercises/:id', (req, res) => {
  db.prepare('DELETE FROM exercises WHERE id=?').run(Number(req.params.id));
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
//  WORKOUT PLANS
// ═══════════════════════════════════════════════════════

app.get('/api/plans', (req, res) => {
  res.json(db.prepare('SELECT * FROM workout_plans').all());
});

app.get('/api/plans/:id', (req, res) => {
  res.json(db.prepare('SELECT * FROM workout_plans WHERE id=?').get(Number(req.params.id)));
});

app.post('/api/plans', (req, res) => {
  const { goal, difficulty = 'Beginner', duration = 0, trainerId = null } = req.body;
  const r = db.prepare(
    'INSERT INTO workout_plans (goal, difficulty, duration, trainerId) VALUES (?,?,?,?)'
  ).run(goal, difficulty, duration, trainerId);
  res.json(db.prepare('SELECT * FROM workout_plans WHERE id=?').get(r.lastInsertRowid));
});

app.put('/api/plans/:id', (req, res) => {
  const { goal, difficulty = 'Beginner', duration = 0, trainerId = null } = req.body;
  const id = Number(req.params.id);
  db.prepare('UPDATE workout_plans SET goal=?, difficulty=?, duration=?, trainerId=? WHERE id=?')
    .run(goal, difficulty, duration, trainerId, id);
  res.json(db.prepare('SELECT * FROM workout_plans WHERE id=?').get(id));
});

app.delete('/api/plans/:id', (req, res) => {
  db.prepare('DELETE FROM workout_plans WHERE id=?').run(Number(req.params.id));
  res.json({ success: true });
});

// Plan ↔ Exercise junction
app.get('/api/plans/:id/exercises', (req, res) => {
  res.json(db.prepare('SELECT * FROM plan_exercises WHERE planId=?').all(Number(req.params.id)));
});

app.put('/api/plans/:id/exercises', (req, res) => {
  const planId = Number(req.params.id);
  const { exerciseIds = [] } = req.body;
  db.prepare('DELETE FROM plan_exercises WHERE planId=?').run(planId);
  const ins = db.prepare('INSERT OR IGNORE INTO plan_exercises (planId, exerciseId) VALUES (?,?)');
  exerciseIds.forEach(eid => ins.run(planId, eid));
  res.json({ success: true });
});

// Member ↔ Plan follows junction
app.get('/api/member-plans/:memberId', (req, res) => {
  res.json(db.prepare('SELECT * FROM member_plans WHERE memberId=?').all(Number(req.params.memberId)));
});

app.post('/api/member-plans', (req, res) => {
  const { memberId, planId } = req.body;
  db.prepare('INSERT OR IGNORE INTO member_plans (memberId, planId) VALUES (?,?)').run(memberId, planId);
  res.json({ success: true });
});

app.delete('/api/member-plans', (req, res) => {
  const { memberId, planId } = req.body;
  db.prepare('DELETE FROM member_plans WHERE memberId=? AND planId=?').run(memberId, planId);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
//  PROGRESS LOGS
// ═══════════════════════════════════════════════════════

app.get('/api/progress/:memberId', (req, res) => {
  res.json(db.prepare('SELECT * FROM progress_logs WHERE memberId=? ORDER BY date ASC')
    .all(Number(req.params.memberId)));
});

app.post('/api/progress', (req, res) => {
  const { memberId, date = today(), weight = 0, bodyFat = 0 } = req.body;
  const r = db.prepare(
    'INSERT INTO progress_logs (memberId, date, weight, bodyFat) VALUES (?,?,?,?)'
  ).run(memberId, date, weight, bodyFat);
  res.json(db.prepare('SELECT * FROM progress_logs WHERE id=?').get(r.lastInsertRowid));
});

app.delete('/api/progress/:id', (req, res) => {
  db.prepare('DELETE FROM progress_logs WHERE id=?').run(Number(req.params.id));
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════════════════════

app.get('/api/payments/:memberId', (req, res) => {
  res.json(db.prepare('SELECT * FROM payments WHERE memberId=?').all(Number(req.params.memberId)));
});

app.post('/api/payments', (req, res) => {
  const { memberId, amount, method = '' } = req.body;
  const r = db.prepare('INSERT INTO payments (memberId, amount, method) VALUES (?,?,?)')
    .run(memberId, amount, method);
  res.json(db.prepare('SELECT * FROM payments WHERE id=?').get(r.lastInsertRowid));
});

// ═══════════════════════════════════════════════════════
//  SPA FALLBACK
// ═══════════════════════════════════════════════════════
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ╔═══════════════════════════════════════════╗`);
  console.log(`  ║   FitTrack — Gym Training & Progress      ║`);
  console.log(`  ║   Server running on http://localhost:${PORT}  ║`);
  console.log(`  ╚═══════════════════════════════════════════╝\n`);
});
