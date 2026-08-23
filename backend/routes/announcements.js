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
const { cleanField, isValidDate } = require("../lib/validate.js");

async function canManageAnnouncements(pool, adminId) {
  const { rows } = await pool.query("SELECT role FROM admin_roles WHERE admin_id = $1", [adminId]);
  const role = rows.length === 0 ? "ADMIN" : rows[0].role;
  return ["ADMIN","MANAGER"].includes(role);
}

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
  if (!await canManageAnnouncements(pool, req.admin.id)) {
    return res.status(403).json({ error: "Your role cannot manage announcements" });
  }
  const { heading, content, image_url, start_date, end_date } = req.body;

  if (!heading?.trim() || !content?.trim() || !start_date || !end_date) {
    return res.status(400).json({
      error: "heading, content, start_date and end_date are required",
    });
  }
  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return res.status(400).json({ error: "start_date and end_date must be valid dates" });
  }

  try {
    const id = uuidv4().slice(0, 20);
    const { rows } = await pool.query(
      `INSERT INTO announcements (id, heading, content, image_url, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, cleanField(heading, 200), cleanField(content, 5000), cleanField(image_url, 500), start_date, end_date]
    );
    res.status(201).json({ announcement: rows[0] });
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── PATCH /api/announcements/:id — update (admin) ──────────── */
router.patch("/:id", requireAuth, async (req, res) => {
  if (!await canManageAnnouncements(pool, req.admin.id)) {
    return res.status(403).json({ error: "Your role cannot manage announcements" });
  }
  const allowed  = ["heading", "content", "image_url", "start_date", "end_date", "active"];
  const textCols = { heading: 200, content: 5000, image_url: 500 };
  const updates  = [];
  const values   = [];

  if (req.body.start_date !== undefined && !isValidDate(req.body.start_date)) {
    return res.status(400).json({ error: "start_date must be a valid date" });
  }
  if (req.body.end_date !== undefined && !isValidDate(req.body.end_date)) {
    return res.status(400).json({ error: "end_date must be a valid date" });
  }

  for (const key of allowed) {
    let val = req.body[key];
    if (val === undefined) continue;
    if (key in textCols && typeof val === "string") {
      val = cleanField(val, textCols[key]) ?? "";
    }
    values.push(val);
    updates.push(`${key} = $${values.length}`);
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
  if (!await canManageAnnouncements(pool, req.admin.id)) {
    return res.status(403).json({ error: "Your role cannot manage announcements" });
  }
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