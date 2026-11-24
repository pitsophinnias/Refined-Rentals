/**
 * routes/auth.js
 *
 * POST /api/auth/login   — validate credentials, return JWT in response body
 * POST /api/auth/logout  — ends this login's session (the client also discards the token)
 * GET  /api/auth/me      — verify token, return admin info
 */

const router   = require("express").Router();
const bcrypt   = require("bcrypt");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const { pool } = require("../db.js");
const { lockStatus, clearOwnFailures } = require("../lib/loginLockout.js");
const { getSessionSettings } = require("../lib/sessionSettings.js");
require("dotenv").config();

// Nginx resolves the real visitor IP from Cloudflare (set_real_ip_from in
// /etc/nginx/conf.d/cloudflare-realip.conf), so req.ip is the visitor. The
// CF-Connecting-IP header itself is never trusted: anyone reaching the server
// directly could fake it to dodge the login lockout.
function clientIp(req) {
  return String(req.ip || "");
}

/* For the System Admin's Login Activity page. Never blocks a login. */
async function recordLogin(req, adminId, email, success) {
  try {
    await pool.query(
      `INSERT INTO login_events (admin_id, email, success, ip, user_agent) VALUES ($1, $2, $3, $4, $5)`,
      [adminId || null, String(email || "").trim().toLowerCase().slice(0, 255), success,
       clientIp(req).slice(0, 64), String(req.headers["user-agent"] || "").slice(0, 255)]
    );
  } catch (err) {
    console.error("Login event error:", err);
  }
}

/* ── Login ───────────────────────────────────────────────────── */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Too many recent failures from this IP or for this email? (see lib/loginLockout.js)
    try {
      const lock = await lockStatus(clientIp(req), email);
      if (lock.locked) {
        return res.status(429).json({ error: `Too many failed attempts. Please wait ${lock.minutesLeft} minute${lock.minutesLeft === 1 ? "" : "s"} and try again.` });
      }
    } catch (err) {
      console.error("Lockout check error:", err); // fail open, the rate limiter still applies
    }

    const { rows } = await pool.query(
      "SELECT * FROM admins WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    // Always run bcrypt even if user not found — prevents timing attacks
    const dummyHash = "$2b$12$invalidhashfortimingprotectiononly000000000000000000000";
    const hash      = rows[0]?.password_hash || dummyHash;
    const match     = await bcrypt.compare(password, hash);

    if (rows.length === 0 || !match) {
      await recordLogin(req, rows[0]?.id, email, false);
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const admin = rows[0];
    await recordLogin(req, admin.id, admin.email, true);
    await clearOwnFailures(clientIp(req), admin.email).catch(() => {});

    const { maxHours } = await getSessionSettings();
    const jti = crypto.randomUUID();
    await pool.query("INSERT INTO sessions (jti, admin_id) VALUES ($1, $2)", [jti, admin.id]);
    const token = jwt.sign(
      { id: admin.id, email: admin.email, tv: admin.token_version || 0, jti },
      process.env.JWT_SECRET,
      { expiresIn: `${maxHours}h` }
    );

    res.json({
      token,
      admin: { id: admin.id, email: admin.email, must_change_password: admin.must_change_password === true },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── Logout — ends this session server-side ──────────────────── */
router.post("/logout", async (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      // ignoreExpiration: an expired token can still be signed out cleanly
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { ignoreExpiration: true });
      if (payload.jti) await pool.query("UPDATE sessions SET revoked_at = NOW() WHERE jti = $1 AND revoked_at IS NULL", [payload.jti]);
    } catch { /* invalid token: nothing to end */ }
  }
  res.json({ message: "Logged out" });
});

/* ── Me ──────────────────────────────────────────────────────── */
router.get("/me", require("../middleware/auth.js"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.email, a.created_at, a.must_change_password,
              COALESCE(r.role, 'ADMIN') AS role
       FROM admins a
       LEFT JOIN admin_roles r ON r.admin_id = a.id
       WHERE a.id = $1`,
      [req.admin.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Admin not found" });
    res.json({ admin: rows[0] });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;