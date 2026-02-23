const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const SECRET = process.env.JWT_SECRET;
const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 7;

function issueTokens(user, req) {
  const jti = uuidv4();
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, name: user.name, jti },
    SECRET,
    { expiresIn: ACCESS_TTL }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, jti, type: "refresh" },
    SECRET,
    { expiresIn: `${REFRESH_TTL_DAYS}d` }
  );

  const expiresAt = new Date(
    Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  db.prepare(
    `INSERT INTO sessions (user_id, token_jti, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    user.id,
    jti,
    req.headers["user-agent"] || null,
    req.ip || null,
    expiresAt
  );

  return { accessToken, refreshToken };
}

function verifyAccess(token) {
  return jwt.verify(token, SECRET);
}

function verifyRefresh(token) {
  const payload = jwt.verify(token, SECRET);
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  const session = db
    .prepare(`SELECT * FROM sessions WHERE token_jti = ?`)
    .get(payload.jti);
  if (!session) throw new Error("Session revoked");
  return { payload, session };
}

function revokeSession(jti) {
  db.prepare(`DELETE FROM sessions WHERE token_jti = ?`).run(jti);
}

function revokeAllSessions(userId) {
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

module.exports = { issueTokens, verifyAccess, verifyRefresh, revokeSession, revokeAllSessions };
