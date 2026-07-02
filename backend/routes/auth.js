/**
 * routes/auth.js
 * POST /api/auth/login   — validate credentials, return JWT
 * GET  /api/auth/me      — verify token, return admin info
 */

const router  = require("express").Router();
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const { pool } = require("../db.js");
require("dotenv").config();

/* ── Login ───────────────────────────────────────────────────── */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM admins WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
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

/* ── Me ──────────────────────────────────────────────────────── */
router.get("/me", require("../middleware/auth.js"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, created_at FROM admins WHERE id = $1",
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