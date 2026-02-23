const router = require("express").Router();
const db = require("./db");
const { authenticate } = require("./middleware");

router.use(authenticate);

router.get("/me", (req, res) => {
  const user = db
    .prepare("SELECT id, name, email, weekly_goal, timezone, avatar, bio, created_at FROM users WHERE id = ?")
    .get(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  const streak = db.prepare("SELECT * FROM streaks WHERE user_id = ?").get(user.id) || {};
  res.json({ ...user, weekly_goal_hours: user.weekly_goal || 0, streak });
});

router.patch("/me", (req, res) => {
  const { name, weekly_goal, weekly_goal_hours, timezone, avatar, bio } = req.body;
  const fields = [], values = [];
  if (name        !== undefined) { fields.push("name = ?");        values.push(name); }
  const wg = weekly_goal_hours !== undefined ? weekly_goal_hours : weekly_goal;
  if (wg !== undefined) { fields.push("weekly_goal = ?"); values.push(wg); }
  if (timezone    !== undefined) { fields.push("timezone = ?");    values.push(timezone); }
  if (avatar      !== undefined) { fields.push("avatar = ?");      values.push(avatar); }
  if (bio         !== undefined) { fields.push("bio = ?");         values.push(bio); }
  if (!fields.length) return res.status(400).json({ error: "No fields to update." });
  fields.push("updated_at = datetime('now')");
  values.push(req.user.sub);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});


router.put("/me", (req, res) => {
  const { name, weekly_goal, weekly_goal_hours, timezone, avatar, bio } = req.body;
  const fields = [], values = [];
  if (name        !== undefined) { fields.push("name = ?");        values.push(name); }
  const wg = weekly_goal_hours !== undefined ? weekly_goal_hours : weekly_goal;
  if (wg !== undefined) { fields.push("weekly_goal = ?"); values.push(wg); }
  if (timezone !== undefined) { fields.push("timezone = ?"); values.push(timezone); }
  if (avatar   !== undefined) { fields.push("avatar = ?");   values.push(avatar); }
  if (bio      !== undefined) { fields.push("bio = ?");      values.push(bio); }
  if (!fields.length) return res.status(400).json({ error: "No fields to update." });
  fields.push("updated_at = datetime('now')");
  values.push(req.user.sub);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  const user = db.prepare("SELECT id, name, email, weekly_goal, bio, created_at FROM users WHERE id = ?").get(req.user.sub);
  res.json({ ok: true, user: { ...user, weekly_goal_hours: user.weekly_goal || 0 } });
});

router.put("/me/password", async (req, res) => {
  const bcrypt = require("bcryptjs");
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: "Current and new password are required." });
  if (new_password.length < 8)
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.sub);
  const valid = await bcrypt.compare(current_password, user.password);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect." });
  const hash = await bcrypt.hash(new_password, 12);
  db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?").run(hash, user.id);
  res.json({ ok: true });
});

router.patch("/me/password", async (req, res) => {
  const bcrypt = require("bcryptjs");
  const { current, next: next_password } = req.body;
  if (!current || !next_password)
    return res.status(400).json({ error: "Current and new password are required." });
  if (next_password.length < 8)
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.sub);
  const valid = await bcrypt.compare(current, user.password);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect." });
  const hash = await bcrypt.hash(next_password, 12);
  db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?").run(hash, user.id);
  res.json({ ok: true });
});

router.get("/logs", (req, res) => {
  const { start, end, limit = 90, subject, min_hours } = req.query;
  let query = "SELECT * FROM study_logs WHERE user_id = ?";
  const params = [req.user.sub];
  if (start)     { query += " AND date >= ?";      params.push(start); }
  if (end)       { query += " AND date <= ?";      params.push(end); }
  if (subject)   { query += " AND subject LIKE ?"; params.push(`%${subject}%`); }
  if (min_hours) { query += " AND hours >= ?";     params.push(Number(min_hours)); }
  query += ` ORDER BY date DESC LIMIT ${Math.min(Number(limit), 365)}`;
  res.json({ logs: db.prepare(query).all(...params) });
});

router.post("/logs", (req, res) => {
  const { date, hours, subject, notes, mood, tags } = req.body;
  if (!date) return res.status(400).json({ error: "date is required." });
  if (hours === undefined || hours < 0 || hours > 24)
    return res.status(400).json({ error: "Hours must be between 0 and 24." });
  const tagsStr = Array.isArray(tags) ? tags.join(",") : (tags || null);
  const existing = db
    .prepare("SELECT id FROM study_logs WHERE user_id = ? AND date = ?")
    .get(req.user.sub, date);
  if (existing) {
    db.prepare(
      `UPDATE study_logs SET hours=?, subject=?, notes=?, mood=?, tags=?, updated_at=datetime('now') WHERE user_id=? AND date=?`
    ).run(hours, subject || null, notes || null, mood || null, tagsStr, req.user.sub, date);
    updateStreak(req.user.sub);
    return res.json({ ok: true, id: existing.id });
  }
  const info = db.prepare(
    `INSERT INTO study_logs (user_id, date, hours, subject, notes, mood, tags) VALUES (?,?,?,?,?,?,?)`
  ).run(req.user.sub, date, hours, subject || null, notes || null, mood || null, tagsStr);
  updateStreak(req.user.sub);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.get("/logs/:date", (req, res) => {
  const log = db
    .prepare("SELECT * FROM study_logs WHERE user_id = ? AND date = ?")
    .get(req.user.sub, req.params.date);
  if (!log) return res.status(404).json({ error: "Log not found." });
  res.json(log);
});

router.put("/logs/:date", (req, res) => {
  const { hours, subject, notes, mood, tags } = req.body;
  const { date } = req.params;
  if (hours === undefined || hours < 0 || hours > 24)
    return res.status(400).json({ error: "Hours must be between 0 and 24." });
  const tagsStr = Array.isArray(tags) ? tags.join(",") : (tags || null);
  const existing = db
    .prepare("SELECT id FROM study_logs WHERE user_id = ? AND date = ?")
    .get(req.user.sub, date);
  if (existing) {
    db.prepare(
      `UPDATE study_logs SET hours=?, subject=?, notes=?, mood=?, tags=?, updated_at=datetime('now')
       WHERE user_id=? AND date=?`
    ).run(hours, subject || null, notes || null, mood || null, tagsStr, req.user.sub, date);
  } else {
    db.prepare(
      `INSERT INTO study_logs (user_id, date, hours, subject, notes, mood, tags) VALUES (?,?,?,?,?,?,?)`
    ).run(req.user.sub, date, hours, subject || null, notes || null, mood || null, tagsStr);
  }
  updateStreak(req.user.sub);
  res.json({ ok: true });
});

router.delete("/logs/:id", (req, res) => {
  const param = req.params.id;
  if (/^\d+$/.test(param)) {
    db.prepare("DELETE FROM study_logs WHERE id = ? AND user_id = ?").run(Number(param), req.user.sub);
  } else {
    db.prepare("DELETE FROM study_logs WHERE date = ? AND user_id = ?").run(param, req.user.sub);
  }
  res.json({ ok: true });
});

router.get("/stats", (req, res) => {
  const uid = req.user.sub;
  const allTime = db.prepare(
    "SELECT SUM(hours) as total, COUNT(*) as days, AVG(hours) as avg, MAX(hours) as best_day FROM study_logs WHERE user_id = ?"
  ).get(uid);
  const thisWeek = (() => {
    const today = new Date();
    const dow = (today.getDay() + 6) % 7;
    const mon = new Date(today); mon.setDate(today.getDate() - dow);
    const start = mon.toISOString().slice(0, 10);
    const end = today.toISOString().slice(0, 10);
    return db.prepare(
      "SELECT SUM(hours) as total, COUNT(*) as days FROM study_logs WHERE user_id = ? AND date BETWEEN ? AND ?"
    ).get(uid, start, end);
  })();
  const thisMonth = (() => {
    const today = new Date();
    const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    return db.prepare("SELECT SUM(hours) as total, COUNT(*) as days FROM study_logs WHERE user_id = ? AND date >= ?").get(uid, start);
  })();
  const lastMonth = (() => {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const start = d.toISOString().slice(0, 10);
    const end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);
    return db.prepare("SELECT SUM(hours) as total FROM study_logs WHERE user_id = ? AND date BETWEEN ? AND ?").get(uid, start, end);
  })();
  const streak = db.prepare("SELECT * FROM streaks WHERE user_id = ?").get(uid) || {};
  const topSubjects = db.prepare(
    `SELECT subject, SUM(hours) as total, COUNT(*) as sessions FROM study_logs WHERE user_id = ? AND subject IS NOT NULL
     GROUP BY subject ORDER BY total DESC LIMIT 8`
  ).all(uid);
  const moodDist = db.prepare(
    `SELECT mood, COUNT(*) as count FROM study_logs WHERE user_id = ? AND mood IS NOT NULL GROUP BY mood ORDER BY mood`
  ).all(uid);
  const weeklyTrend = db.prepare(
    `SELECT strftime('%W-%Y', date) as week, SUM(hours) as total FROM study_logs
     WHERE user_id = ? AND date >= date('now', '-12 weeks') GROUP BY week ORDER BY week ASC LIMIT 12`
  ).all(uid);
  const recentActivity = db.prepare(
    `SELECT date, hours, subject, mood FROM study_logs WHERE user_id = ? ORDER BY date DESC LIMIT 14`
  ).all(uid);
  const today2 = db.prepare(
    "SELECT SUM(hours) as total FROM study_logs WHERE user_id = ? AND date = date('now')"
  ).get(uid);
  const moodDistArr = {};
  moodDist.forEach(r => { moodDistArr[r.mood] = r.count; });
  const weeklyTrendMapped = weeklyTrend.map(w => ({ week: w.week, hours: w.total || 0 }));
  res.json({
    allTime,
    today: today2?.total || 0,
    week: thisWeek?.total || 0,
    thisWeekDays: (() => {
      const days = [];
      const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0,10);
        const row = db.prepare("SELECT SUM(hours) as hours FROM study_logs WHERE user_id = ? AND date = ?").get(uid, dateStr);
        days.push({ date: dateStr, day_label: dayLabels[d.getDay()], hours: row?.hours || 0 });
      }
      return days;
    })(),
    month: thisMonth?.total || 0,
    streak: streak.current_streak || 0,
    longestStreak: streak.longest_streak || 0,
    subjects: topSubjects.map(s => ({ subject: s.subject, hours: s.total })),
    moodDist: moodDistArr,
    weeklyTrend: weeklyTrendMapped,
    recentActivity,
  });
});

router.get("/calendar", (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: "year and month required." });
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end   = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10);
  res.json(db.prepare(
    "SELECT date, hours, subject, mood, tags FROM study_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date"
  ).all(req.user.sub, start, end));
});

router.get("/goals", (req, res) => {
  res.json({ goals: db.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC").all(req.user.sub) });
});

router.post("/goals", (req, res) => {
  const { title, target_date, target_hours, color, description } = req.body;
  if (!title || !target_hours)
    return res.status(400).json({ error: "Title and target hours are required." });
  const finalTargetDate = target_date || null;
  const info = db.prepare(
    `INSERT INTO goals (user_id, title, target_date, target_hours, color, description) VALUES (?,?,?,?,?,?)`
  ).run(req.user.sub, title, finalTargetDate || "", target_hours, color || "#4f46e5", description || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put("/goals/:id", (req, res) => {
  const { completed, title, target_date, target_hours, color, description } = req.body;
  const fields = [], values = [];
  if (completed    !== undefined) { fields.push("completed = ?");    values.push(completed ? 1 : 0); }
  if (title        !== undefined) { fields.push("title = ?");        values.push(title); }
  if (target_date  !== undefined) { fields.push("target_date = ?");  values.push(target_date); }
  if (target_hours !== undefined) { fields.push("target_hours = ?"); values.push(target_hours); }
  if (color        !== undefined) { fields.push("color = ?");        values.push(color); }
  if (description  !== undefined) { fields.push("description = ?");  values.push(description); }
  if (!fields.length) return res.status(400).json({ error: "Nothing to update." });
  values.push(req.params.id, req.user.sub);
  db.prepare(`UPDATE goals SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  res.json({ ok: true });
});

router.patch("/goals/:id", (req, res) => {
  const { completed, title, target_date, target_hours, color, description } = req.body;
  const fields = [], values = [];
  if (completed    !== undefined) { fields.push("completed = ?");    values.push(completed ? 1 : 0); }
  if (title        !== undefined) { fields.push("title = ?");        values.push(title); }
  if (target_date  !== undefined) { fields.push("target_date = ?");  values.push(target_date); }
  if (target_hours !== undefined) { fields.push("target_hours = ?"); values.push(target_hours); }
  if (color        !== undefined) { fields.push("color = ?");        values.push(color); }
  if (description  !== undefined) { fields.push("description = ?");  values.push(description); }
  if (!fields.length) return res.status(400).json({ error: "Nothing to update." });
  values.push(req.params.id, req.user.sub);
  db.prepare(`UPDATE goals SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete("/goals/:id", (req, res) => {
  db.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").run(req.params.id, req.user.sub);
  res.json({ ok: true });
});

router.get("/tags", (req, res) => {
  const rows = db.prepare("SELECT tags FROM study_logs WHERE user_id = ? AND tags IS NOT NULL").all(req.user.sub);
  const set = new Set();
  rows.forEach((r) => r.tags.split(",").forEach((t) => t.trim() && set.add(t.trim())));
  res.json({ tags: [...set].sort() });
});

router.get("/pomodoro", (req, res) => {
  res.json({ sessions: db.prepare("SELECT * FROM pomodoro_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 50").all(req.user.sub) });
});

router.post("/pomodoro", (req, res) => {
  const { duration, type, subject, completed } = req.body;
  if (!duration || !type) return res.status(400).json({ error: "duration and type are required." });
  const info = db.prepare(
    `INSERT INTO pomodoro_sessions (user_id, duration, type, subject, completed) VALUES (?,?,?,?,?)`
  ).run(req.user.sub, duration, type, subject || null, completed ? 1 : 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get("/pomodoro/stats", (req, res) => {
  const uid = req.user.sub;
  const today = new Date().toISOString().slice(0, 10);
  const total  = db.prepare("SELECT COUNT(*) as count, SUM(duration) as total_min FROM pomodoro_sessions WHERE user_id = ? AND completed = 1").get(uid);
  const todayP = db.prepare("SELECT COUNT(*) as count FROM pomodoro_sessions WHERE user_id = ? AND completed = 1 AND date(started_at) = ?").get(uid, today);
  res.json({ total_sessions: total?.count || 0, total_minutes: total?.total_min || 0, today: todayP?.count || 0 });
});

router.get("/export/csv", (req, res) => {
  const logs = db.prepare("SELECT date, hours, subject, notes, mood, tags FROM study_logs WHERE user_id = ? ORDER BY date DESC").all(req.user.sub);
  const header = "date,hours,subject,notes,mood,tags\n";
  const rows = logs.map((l) =>
    [l.date, l.hours, `"${(l.subject||"").replace(/"/g,'""')}"`,
     `"${(l.notes||"").replace(/"/g,'""')}"`, l.mood||"", l.tags||""].join(",")
  ).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="study-logs.csv"`);
  res.send(header + rows);
});

router.get("/export/json", (req, res) => {
  const logs  = db.prepare("SELECT * FROM study_logs WHERE user_id = ? ORDER BY date DESC").all(req.user.sub);
  const goals = db.prepare("SELECT * FROM goals WHERE user_id = ?").all(req.user.sub);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="study-tracker-export.json"`);
  res.json({ exported_at: new Date().toISOString(), logs, goals });
});

router.get("/insights", (req, res) => {
  const uid = req.user.sub;
  const bestDay = db.prepare("SELECT date, hours FROM study_logs WHERE user_id = ? ORDER BY hours DESC LIMIT 1").get(uid);
  const avgPerWeekdayRows = db.prepare(
    `SELECT strftime('%w', date) as dow, AVG(hours) as avg FROM study_logs WHERE user_id = ? GROUP BY dow ORDER BY dow`
  ).all(uid);
  const avgPerWeekday = [0,1,2,3,4,5,6].map(i => {
    const r = avgPerWeekdayRows.find(r => Number(r.dow) === i);
    return r ? r.avg : 0;
  });
  const last30 = db.prepare(
    `SELECT COUNT(DISTINCT date) as active FROM study_logs WHERE user_id = ? AND date >= date('now','-30 days') AND hours > 0`
  ).get(uid);
  const consistency = ((last30?.active || 0) / 30) * 100;
  const longestSession = db.prepare("SELECT hours FROM study_logs WHERE user_id = ? ORDER BY hours DESC LIMIT 1").get(uid);
  const thisMonth = db.prepare(
    "SELECT SUM(hours) as total FROM study_logs WHERE user_id = ? AND date >= date('now','start of month')"
  ).get(uid);
  const lastMonth = db.prepare(
    "SELECT SUM(hours) as total FROM study_logs WHERE user_id = ? AND date >= date('now','start of month','-1 month') AND date < date('now','start of month')"
  ).get(uid);
  res.json({
    bestDay,
    avgPerWeekday,
    consistency,
    longestSession: longestSession?.hours || 0,
    thisMonth: thisMonth?.total || 0,
    lastMonth: lastMonth?.total || 0,
  });
});

function updateStreak(userId) {
  const dates = db.prepare(
    "SELECT date FROM study_logs WHERE user_id = ? AND hours > 0 ORDER BY date DESC LIMIT 400"
  ).all(userId).map((l) => l.date).sort().reverse();
  if (!dates.length) return;
  let current = 0, prev = null;
  for (const d of dates) {
    if (!prev) { current = 1; prev = d; continue; }
    const diff = (new Date(prev) - new Date(d)) / 86400000;
    if (diff === 1) current++;
    else if (diff > 1) break;
    prev = d;
  }
  const existing = db.prepare("SELECT longest_streak FROM streaks WHERE user_id = ?").get(userId);
  const longest  = Math.max(current, existing?.longest_streak || 0);
  db.prepare(
    `INSERT INTO streaks (user_id, current_streak, longest_streak, last_study_date)
     VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
       current_streak=excluded.current_streak, longest_streak=excluded.longest_streak,
       last_study_date=excluded.last_study_date`
  ).run(userId, current, longest, dates[0]);
}

module.exports = router;
