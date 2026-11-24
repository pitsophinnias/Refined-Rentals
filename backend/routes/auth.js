/**
 * routes/auth.js
 *
 * POST /api/auth/login   — validate credentials, return JWT in response body
 * POST /api/auth/logout  — stateless, client discards token
 * GET  /api/auth/me      — verify token, return admin info
 */

const router   = require("express").Router();
const bcrypt   = require("bcrypt");
const jwt      = require("jsonwebtoken");
const { pool } = require("../db.js");
require("dotenv").config();

// The site sits behind Cloudflare, so req.ip is a Cloudflare address; Cloudflare
// passes the visitor's real IP in CF-Connecting-IP. Display only, never trusted
// for security decisions.
function clientIp(req) {
  const cf = req.headers["cf-connecting-ip"];
  return String((typeof cf === "string" && cf.trim()) || req.ip || "");
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
    const token = jwt.sign(
      { id: admin.id, email: admin.email, tv: admin.token_version || 0 },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.json({
      token,
      admin: { id: admin.id, email: admin.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── Logout — stateless, client discards token ───────────────── */
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out" });
});

/* ── Me ──────────────────────────────────────────────────────── */
router.get("/me", require("../middleware/auth.js"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.email, a.created_at,
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