const { verifyAccess } = require("./auth");

function authenticate(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authorization required." });
  try {
    req.user = verifyAccess(token);
    next();
  } catch {
    res.status(401).json({ error: "Session is invalid or expired." });
  }
}

function optionalAuth(req, _res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      req.user = verifyAccess(token);
    } catch {}
  }
  next();
}

module.exports = { authenticate, optionalAuth };
