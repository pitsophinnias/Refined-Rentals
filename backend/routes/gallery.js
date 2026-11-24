/**
 * routes/gallery.js
 *
 * GET    /api/gallery              — list items (public), optional ?category=main|contact
 * POST   /api/gallery              — upload image/video (admin, "gallery" permission)
 * PATCH  /api/gallery/reorder      — batch update sort_order (admin)
 * PATCH  /api/gallery/:id          — update label (admin)
 * DELETE /api/gallery/:id          — remove item + file (admin)
 *
 * Restored from c97a0f2. Commit fcc8dcb accidentally overwrote this file with
 * a copy of routes/requests.js, so gallery uploads silently broke and the
 * public gallery endpoint demanded a login. Brought up to date with the
 * permission checks and input cleaning the other routes gained since.
 */

const router      = require("express").Router();
const multer      = require("multer");
const path        = require("path");
const fs          = require("fs");
const { pool }    = require("../db.js");
const requireAuth = require("../middleware/auth.js");
const { cleanField } = require("../lib/validate.js");
const { can }     = require("../lib/roles.js");

/* ── Multer config ───────────────────────────────────────────── */
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "gallery");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const VIDEO_EXT = /^(mp4|mov|avi|webm)$/;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (/^(jpe?g|png|gif|webp)$/.test(ext) || VIDEO_EXT.test(ext)) return cb(null, true);
    cb(new Error(`File type .${ext} not allowed`), false);
  },
  limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 },
});

const cleanCategory = (c) => (c === "contact" ? "contact" : "main");

/* Permission guard for every write route */
async function requireGallery(req, res, next) {
  try {
    if (await can(req.admin.id, "gallery")) return next();
    res.status(403).json({ error: "You do not have permission to perform this action." });
  } catch (err) {
    console.error("Gallery permission check error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/* ── GET /api/gallery — public ───────────────────────────────── */
router.get("/", async (req, res) => {
  const { category } = req.query;
  try {
    const { rows } = category
      ? await pool.query(
          "SELECT * FROM gallery WHERE category = $1 ORDER BY sort_order ASC, uploaded_at ASC",
          [cleanCategory(category)]
        )
      : await pool.query("SELECT * FROM gallery ORDER BY sort_order ASC, uploaded_at ASC");
    res.json({ gallery: rows });
  } catch (err) {
    console.error("Gallery list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── POST /api/gallery — upload ──────────────────────────────── */
router.post("/", requireAuth, requireGallery, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const category = cleanCategory(req.body.category);
    const ext      = path.extname(req.file.filename).toLowerCase().slice(1);
    const type     = VIDEO_EXT.test(ext) ? "video" : "image";
    const url      = `/uploads/gallery/${req.file.filename}`;
    const label    = cleanField(req.body.label, 200)
                  || cleanField(req.file.originalname.replace(/\.[^.]+$/, ""), 200)
                  || "";

    try {
      const { rows: maxRow } = await pool.query(
        "SELECT COALESCE(MAX(sort_order), -1) AS max FROM gallery WHERE category = $1",
        [category]
      );
      const { rows } = await pool.query(
        `INSERT INTO gallery (filename, original_name, label, type, url, sort_order, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.file.filename, cleanField(req.file.originalname, 255), label, type, url, maxRow[0].max + 1, category]
      );
      res.status(201).json({ item: rows[0] });
    } catch (dbErr) {
      fs.unlink(req.file.path, () => {}); // don't leave an orphan file behind
      console.error("Gallery upload error:", dbErr);
      res.status(500).json({ error: "Server error" });
    }
  });
});

/* ── PATCH /api/gallery/reorder — batch reorder ─────────────── */
router.patch("/reorder", requireAuth, requireGallery, async (req, res) => {
  const { items } = req.body; // [{ id, sort_order }, ...]
  const valid = Array.isArray(items) && items.length > 0 && items.length <= 500 &&
    items.every(i => Number.isInteger(Number(i?.id)) && Number.isInteger(Number(i?.sort_order)));
  if (!valid) return res.status(400).json({ error: "items array of { id, sort_order } required" });

  // One client for the whole transaction (pool.query could use a different
  // connection for each statement, which makes BEGIN/ROLLBACK meaningless).
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of items) {
      await client.query("UPDATE gallery SET sort_order = $1 WHERE id = $2",
        [Number(item.sort_order), Number(item.id)]);
    }
    await client.query("COMMIT");
    res.json({ message: "Reordered" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Gallery reorder error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ── PATCH /api/gallery/:id — update label ───────────────────── */
router.patch("/:id", requireAuth, requireGallery, async (req, res) => {
  const label = cleanField(req.body.label, 200);
  if (!label) return res.status(400).json({ error: "label is required" });
  if (!Number.isInteger(Number(req.params.id))) return res.status(404).json({ error: "Item not found" });

  try {
    const { rows } = await pool.query(
      "UPDATE gallery SET label = $1 WHERE id = $2 RETURNING *",
      [label, Number(req.params.id)]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Item not found" });
    res.json({ item: rows[0] });
  } catch (err) {
    console.error("Gallery update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── DELETE /api/gallery/:id ─────────────────────────────────── */
router.delete("/:id", requireAuth, requireGallery, async (req, res) => {
  if (!Number.isInteger(Number(req.params.id))) return res.status(404).json({ error: "Item not found" });
  try {
    const { rows } = await pool.query(
      "DELETE FROM gallery WHERE id = $1 RETURNING filename",
      [Number(req.params.id)]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Item not found" });
    // basename() keeps the delete inside the gallery folder
    fs.unlink(path.join(UPLOAD_DIR, path.basename(rows[0].filename)), () => {});
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Gallery delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
