const router = require("express").Router();
const bcrypt = require("bcryptjs");
const db = require("./db");
const { issueTokens, verifyRefresh, revokeSession, revokeAllSessions } = require("./auth");

router.post("/register", async (req, res) => {
  const { name, email, password, timezone } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "Name, email and password are required." });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Invalid email format." });

  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return res.status(409).json({ error: "This email is already registered." });

  const hash = await bcrypt.hash(password, 12);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password, timezone)
       VALUES (?, ?, ?, ?)`
    )
    .run(name, email, hash, timezone || "Europe/Istanbul");

  const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(info.lastInsertRowid);
  db.prepare("INSERT INTO streaks (user_id) VALUES (?)").run(user.id);

  const tokens = issueTokens(user, req);
  res.status(201).json({ user, ...tokens });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials." });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials." });

  const { password: _pw, ...safe } = user;
  const tokens = issueTokens(safe, req);
  res.json({ user: safe, ...tokens });
});

router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "Refresh token is required." });
  try {
    const { payload } = verifyRefresh(refreshToken);
    revokeSession(payload.jti);
    const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(payload.sub);
    if (!user) return res.status(401).json({ error: "User not found." });
    const tokens = issueTokens(user, req);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: "Invalid refresh token." });
  }
});

router.post("/logout", (req, res) => {
  const { jti } = req.body;
  if (jti) revokeSession(jti);
  res.json({ message: "Logged out successfully." });
});

router.post("/logout-all", require("./middleware").authenticate, (req, res) => {
  revokeAllSessions(req.user.sub);
  res.json({ message: "Logged out from all devices." });
});

router.get("/sessions", require("./middleware").authenticate, (req, res) => {
  const sessions = db
    .prepare("SELECT id, user_agent, ip, created_at, expires_at FROM sessions WHERE user_id = ?")
    .all(req.user.sub);
  res.json(sessions);
});

module.exports = router;
