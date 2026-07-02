/**
 * routes/announcements.js
 *
 * GET    /api/announcements          — all (admin, includes archived)
 * GET    /api/announcements/active   — currently active only (public, customer site)
 * POST   /api/announcements          — create (admin)
 * PATCH  /api/announcements/:id      — update any fields (admin)
 * DELETE /api/announcements/:id      — hard delete (admin)
 */

const router      = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { pool }    = require("../db.js");
const requireAuth = require("../middleware/auth.js");

/* ── GET /api/announcements/active — public ─────────────────── */
// Must be defined before /:id to avoid "active" being treated as an id
router.get("/active", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM announcements
       WHERE active = TRUE
         AND start_date <= CURRENT_DATE
         AND end_date   >= CURRENT_DATE
       ORDER BY created_at DESC`
    );
    res.json({ announcements: rows });
  } catch (err) {
    console.error("Active announcements error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── GET /api/announcements — all (admin) ───────────────────── */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM announcements ORDER BY created_at DESC"
    );
    res.json({ announcements: rows });
  } catch (err) {
    console.error("List announcements error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── POST /api/announcements — create (admin) ───────────────── */
router.post("/", requireAuth, async (req, res) => {
  const { heading, content, image_url, start_date, end_date } = req.body;

  if (!heading || !content || !start_date || !end_date) {
    return res.status(400).json({
      error: "heading, content, start_date and end_date are required",
    });
  }

  try {
    const id = uuidv4().slice(0, 20);
    const { rows } = await pool.query(
      `INSERT INTO announcements (id, heading, content, image_url, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, heading, content, image_url || null, start_date, end_date]
    );
    res.status(201).json({ announcement: rows[0] });
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── PATCH /api/announcements/:id — update (admin) ──────────── */
router.patch("/:id", requireAuth, async (req, res) => {
  const allowed = ["heading", "content", "image_url", "start_date", "end_date", "active"];
  const updates = [];
  const values  = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      values.push(req.body[key]);
      updates.push(`${key} = $${values.length}`);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  values.push(req.params.id);
  const sql = `UPDATE announcements SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`;

  try {
    const { rows } = await pool.query(sql, values);
    if (rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
    res.json({ announcement: rows[0] });
  } catch (err) {
    console.error("Update announcement error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── DELETE /api/announcements/:id — hard delete (admin) ─────── */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM announcements WHERE id = $1",
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Announcement not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete announcement error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;