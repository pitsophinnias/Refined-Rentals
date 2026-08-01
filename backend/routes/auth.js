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
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const admin = rows[0];
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
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