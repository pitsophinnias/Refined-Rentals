/**
 * routes/gallery.js
 *
 * GET    /api/gallery              — list all items (public)
 * POST   /api/gallery              — upload image/video (admin)
 * PATCH  /api/gallery/reorder      — batch update sort_order (admin)
 * PATCH  /api/gallery/:id          — update label (admin)
 * DELETE /api/gallery/:id          — remove item + file (admin)
 */

const router      = require("express").Router();
const multer      = require("multer");
const path        = require("path");
const fs          = require("fs");
const { pool }    = require("../db.js");
const requireAuth = require("../middleware/auth.js");
require("dotenv").config();

/* ── Multer config ───────────────────────────────────────────── */
const UPLOAD_DIR = path.join(__dirname, "..", process.env.UPLOAD_DIR || "uploads/gallery");

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm/;
  const ext     = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowed.test(ext)) return cb(null, true);
  cb(new Error(`File type .${ext} not allowed`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 },
});

/* ── GET /api/gallery ────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM gallery ORDER BY sort_order ASC, uploaded_at ASC"
    );
    res.json({ gallery: rows });
  } catch (err) {
    console.error("Gallery list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── POST /api/gallery — upload ──────────────────────────────── */
router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const { label } = req.body;
  const isVideo   = /mp4|mov|avi|webm/.test(path.extname(req.file.filename).slice(1));
  const type      = isVideo ? "video" : "image";
  const url       = `/uploads/gallery/${req.file.filename}`;

  try {
    // Sort order = current max + 1
    const { rows: maxRow } = await pool.query(
      "SELECT COALESCE(MAX(sort_order), -1) AS max FROM gallery"
    );
    const sortOrder = maxRow[0].max + 1;

    const { rows } = await pool.query(
      `INSERT INTO gallery (filename, original_name, label, type, url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.file.filename,
        req.file.originalname,
        label || req.file.originalname.replace(/\.[^.]+$/, ""),
        type,
        url,
        sortOrder,
      ]
    );

    res.status(201).json({ item: rows[0] });
  } catch (err) {
    console.error("Gallery upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── PATCH /api/gallery/reorder — batch reorder ─────────────── */
router.patch("/reorder", requireAuth, async (req, res) => {
  const { items } = req.body; // [{ id, sort_order }, ...]

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items array required" });
  }

  try {
    // Update each in a transaction
    await pool.query("BEGIN");
    for (const item of items) {
      await pool.query(
        "UPDATE gallery SET sort_order = $1 WHERE id = $2",
        [item.sort_order, item.id]
      );
    }
    await pool.query("COMMIT");
    res.json({ message: "Reordered" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Reorder error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── PATCH /api/gallery/:id — update label ───────────────────── */
router.patch("/:id", requireAuth, async (req, res) => {
  const { label } = req.body;
  if (!label) return res.status(400).json({ error: "label is required" });

  try {
    const { rows } = await pool.query(
      "UPDATE gallery SET label = $1 WHERE id = $2 RETURNING *",
      [label, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Item not found" });
    res.json({ item: rows[0] });
  } catch (err) {
    console.error("Gallery update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── DELETE /api/gallery/:id ─────────────────────────────────── */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM gallery WHERE id = $1",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Item not found" });

    const item     = rows[0];
    const filepath = path.join(UPLOAD_DIR, item.filename);

    // Delete DB row
    await pool.query("DELETE FROM gallery WHERE id = $1", [req.params.id]);

    // Delete file from disk (don't fail if already gone)
    try { fs.unlinkSync(filepath); } catch {}

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Gallery delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;