/**
 * routes/requests.js
 *
 * POST   /api/requests          — create (public, customer site)
 * GET    /api/requests          — list all (admin)
 * GET    /api/requests/:id      — single detail (admin)
 * PATCH  /api/requests/:id      — update status/notes/quote/closure (admin)
 * DELETE /api/requests/:id      — hard delete (admin)
 */

const router      = require("express").Router();
const { pool }    = require("../db.js");
const requireAuth = require("../middleware/auth.js");

/* ── Helpers ─────────────────────────────────────────────────── */

// Validate RR-### format to prevent path traversal / injection via ID
function isValidId(id) {
  return /^RR-\d{1,6}$/.test(id);
}

function nextId(existing) {
  if (existing.length === 0) return "RR-001";
  const nums = existing
    .map(r => parseInt(r.id.replace("RR-", ""), 10))
    .filter(n => !isNaN(n));
  const next = Math.max(...nums) + 1;
  return `RR-${String(next).padStart(3, "0")}`;
}

// Strip any keys not in the allow-list from an object
function pick(obj, keys) {
  return keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});
}

/* ── POST /api/requests — customer submits quote ─────────────── */
router.post("/", async (req, res) => {
  const {
    name, phone, email, event, location,
    duration, date, startDate, endDate,
    services, tentSize, tentConfig,
    other, message,
  } = req.body;

  // Basic input validation
  if (!name?.trim() || !phone?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "Name, phone and email are required" });
  }

  // Email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  // Duration must be one of the known values
  const validDurations = ["single", "overnight", "multiple"];
  if (duration && !validDurations.includes(duration)) {
    return res.status(400).json({ error: "Invalid duration value" });
  }

  // services must be an array
  if (services !== undefined && !Array.isArray(services)) {
    return res.status(400).json({ error: "services must be an array" });
  }

  try {
    const { rows: existing } = await pool.query("SELECT id FROM quote_requests");
    const id = nextId(existing);

    const { rows } = await pool.query(
      `INSERT INTO quote_requests
         (id, name, phone, email, event, location,
          duration, date, start_date, end_date,
          services, tent_size, tent_config, other, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        id,
        name.trim(),
        phone.trim(),
        email.trim().toLowerCase(),
        event?.trim()      || null,
        location?.trim()   || null,
        duration           || "single",
        date               || null,
        startDate          || null,
        endDate            || null,
        JSON.stringify(services || []),
        tentSize           || null,
        tentConfig         || null,
        other?.trim()      || null,
        message?.trim()    || null,
      ]
    );

    res.status(201).json({ request: rows[0] });
  } catch (err) {
    console.error("Create request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── GET /api/requests — list (admin) ───────────────────────── */
router.get("/", requireAuth, async (req, res) => {
  const { status, search, sort = "submitted_at", order = "desc" } = req.query;

  // Whitelist sort columns to prevent injection
  const safeSort  = ["submitted_at", "name", "status", "event"].includes(sort)
    ? sort : "submitted_at";
  const safeOrder = order === "asc" ? "ASC" : "DESC";

  // Whitelist status values
  const validStatuses = ["NEW", "REVIEW", "QUOTED", "CLOSED"];
  if (status && !validStatuses.includes(status.toUpperCase())) {
    return res.status(400).json({ error: "Invalid status filter" });
  }

  const conditions = [];
  const values     = [];

  if (status) {
    values.push(status.toUpperCase());
    conditions.push(`status = $${values.length}`);
  }

  if (search) {
    // Trim and limit search length to prevent abuse
    const q = search.trim().slice(0, 100);
    values.push(`%${q}%`);
    const n = values.length;
    conditions.push(
      `(name ILIKE $${n} OR email ILIKE $${n} OR event ILIKE $${n} OR location ILIKE $${n})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql   = `SELECT * FROM quote_requests ${where} ORDER BY ${safeSort} ${safeOrder}`;

  try {
    const { rows } = await pool.query(sql, values);
    res.json({ requests: rows });
  } catch (err) {
    console.error("List requests error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── GET /api/requests/:id — single (admin) ─────────────────── */
router.get("/:id", requireAuth, async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid request ID format" });
  }
  try {
    const { rows } = await pool.query(
      "SELECT * FROM quote_requests WHERE id = $1",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
    res.json({ request: rows[0] });
  } catch (err) {
    console.error("Get request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── PATCH /api/requests/:id — update (admin) ───────────────── */
router.patch("/:id", requireAuth, async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid request ID format" });
  }

  const allowed   = ["status", "notes", "quote_data", "reply_channels", "quoted_at", "closed_reason", "closed_note"];
  const jsonbCols = ["quote_data", "reply_channels"];

  // Whitelist status values
  if (req.body.status !== undefined) {
    const validStatuses = ["NEW", "REVIEW", "QUOTED", "CLOSED"];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
  }

  const updates = [];
  const values  = [];

  for (const key of allowed) {
    const val = req.body[key];
    if (val === undefined) continue;

    // Skip null JSONB — leave existing DB value intact
    if (jsonbCols.includes(key) && val === null) continue;

    values.push(
      typeof val === "object" && val !== null
        ? JSON.stringify(val)
        : val
    );
    updates.push(`${key} = $${values.length}`);
  }

  // Auto-set quoted_at when status flips to QUOTED
  if (req.body.status === "QUOTED" && req.body.quoted_at === undefined) {
    values.push(new Date().toISOString());
    updates.push(`quoted_at = $${values.length}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  values.push(req.params.id);
  const sql = `UPDATE quote_requests SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`;

  try {
    const { rows } = await pool.query(sql, values);
    if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
    res.json({ request: rows[0] });
  } catch (err) {
    console.error("Update request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── DELETE /api/requests/:id (admin) ───────────────────────── */
router.delete("/:id", requireAuth, async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: "Invalid request ID format" });
  }
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM quote_requests WHERE id = $1",
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Request not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;