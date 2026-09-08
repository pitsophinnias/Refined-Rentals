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
const rateLimit   = require("express-rate-limit");
const { pool }    = require("../db.js");
const requireAuth = require("../middleware/auth.js");
const { cleanField, isValidDate, cleanServices } = require("../lib/validate.js");
const { can } = require("../lib/roles.js");
const { sendNewRequestNotification, sendQuoteToCustomer } = require("../lib/email.js");

/* ── Rate limiting — quote submission (public, unauthenticated) ─ */
const quoteLimiter = rateLimit({
  windowMs:        60 * 60 * 1000, // 1 hour
  max:             10,              // 10 submissions per IP per hour
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: "Too many quote requests from this IP. Please try again later." },
});

/* ── Audit log helper ─────────────────────────────────────────── */
async function logAction(adminId, adminEmail, action, entityId, detail) {
  try {
    await pool.query(
      `INSERT INTO audit_log (admin_id, admin_email, action, entity, entity_id, detail)
       VALUES ($1, $2, $3, 'quote_request', $4, $5)`,
      [adminId, adminEmail, action, entityId, detail || null]
    );
  } catch {}
}

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
router.post("/", quoteLimiter, async (req, res) => {
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
  if (email.trim().length > 255) {
    return res.status(400).json({ error: "Email is too long" });
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

  // Date fields, when provided, must be real calendar dates
  for (const [label, val] of [["date", date], ["startDate", startDate], ["endDate", endDate]]) {
    if (val !== undefined && val !== null && val !== "" && !isValidDate(val)) {
      return res.status(400).json({ error: `Invalid ${label}` });
    }
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
        cleanField(name, 150),
        cleanField(phone, 40),
        email.trim().toLowerCase().slice(0, 255),
        cleanField(event, 150),
        cleanField(location, 255),
        duration            || "single",
        date                || null,
        startDate           || null,
        endDate              || null,
        JSON.stringify(cleanServices(services) || []),
        cleanField(tentSize, 20),
        cleanField(tentConfig, 20),
        cleanField(other, 2000),
        cleanField(message, 2000),
      ]
    );

    // Fire-and-forget — never let email sending delay or break the response.
    sendNewRequestNotification(rows[0]).catch(err => console.error("New-request email error:", err.message));

    res.status(201).json({ request: rows[0] });
  } catch (err) {
    console.error("Create request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── POST /api/requests/manual — admin creates on behalf of a client
   who contacted via WhatsApp/call (not the customer-facing form) ──── */
router.post("/manual", requireAuth, async (req, res) => {
  // Same roles that can move a request into review: ADMIN, MANAGER, STAFF.
  // FINANCE and VIEWER are denied.
  if (!await can(req.admin.id, "review")) {
    return res.status(403).json({ error: "You do not have permission to perform this action." });
  }

  const {
    name, phone, email, event, location,
    duration, date, startDate, endDate,
    services, tentSize, tentConfig,
    other, message,
  } = req.body;

  // Required fields — email is optional for manual entries (walk-in/phone
  // clients don't always have one on hand), unlike the customer-site form.
  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Customer name and phone are required" });
  }
  if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email address" });
  }
  if (!event?.trim()) {
    return res.status(400).json({ error: "Event name is required" });
  }
  if (!location?.trim()) {
    return res.status(400).json({ error: "Delivery address is required" });
  }

  const validDurations = ["single", "overnight", "multiple"];
  if (!duration || !validDurations.includes(duration)) {
    return res.status(400).json({ error: "Invalid duration value" });
  }
  if (duration === "multiple") {
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start and end date are required" });
    }
  } else if (!date) {
    return res.status(400).json({ error: "Event date is required" });
  }

  if (!Array.isArray(services) || services.length === 0) {
    return res.status(400).json({ error: "At least one service is required" });
  }

  // Date fields, when provided, must be real calendar dates
  for (const [label, val] of [["date", date], ["startDate", startDate], ["endDate", endDate]]) {
    if (val !== undefined && val !== null && val !== "" && !isValidDate(val)) {
      return res.status(400).json({ error: `Invalid ${label}` });
    }
  }

  try {
    const { rows: existing } = await pool.query("SELECT id FROM quote_requests");
    const id = nextId(existing);

    const { rows } = await pool.query(
      `INSERT INTO quote_requests
         (id, name, phone, email, event, location,
          duration, date, start_date, end_date,
          services, tent_size, tent_config, other, message, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        id,
        cleanField(name, 150),
        cleanField(phone, 40),
        email?.trim().toLowerCase().slice(0, 255) || null,
        cleanField(event, 150),
        cleanField(location, 255),
        duration,
        date       || null,
        startDate  || null,
        endDate    || null,
        JSON.stringify(cleanServices(services) || []),
        cleanField(tentSize, 20),
        cleanField(tentConfig, 20),
        cleanField(other, 2000),
        cleanField(message, 2000),
        "manual",
      ]
    );

    await logAction(
      req.admin.id, req.admin.email,
      "MANUAL_REQUEST_CREATED", id,
      `Created manually for ${name.trim()}`
    );

    // Fire-and-forget — never let email sending delay or break the response.
    sendNewRequestNotification(rows[0]).catch(err => console.error("New-request email error:", err.message));

    res.status(201).json({ request: rows[0] });
  } catch (err) {
    console.error("Create manual request error:", err);
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

  // Role-based permission checks
  const { status, quote_data, closed_reason, notes } = req.body;

  // Only ADMIN, MANAGER, FINANCE can build/send quotes
  if (quote_data !== undefined && !await can(req.admin.id, "quote")) {
    return res.status(403).json({ error: "You do not have permission to perform this action." });
  }
  // Only ADMIN, MANAGER, FINANCE can close requests
  if (closed_reason !== undefined && !await can(req.admin.id, "close")) {
    return res.status(403).json({ error: "You do not have permission to perform this action." });
  }
  // STAFF and above can set REVIEW; FINANCE and VIEWER cannot
  if (status === "REVIEW" && !await can(req.admin.id, "review")) {
    return res.status(403).json({ error: "You do not have permission to perform this action." });
  }
  // Any other status change (QUOTED, CLOSED, NEW) requires the same access
  // as building a quote / closing a request — STAFF and VIEWER denied.
  if (status !== undefined && status !== "REVIEW" && !await can(req.admin.id, "close")) {
    return res.status(403).json({ error: "You do not have permission to perform this action." });
  }
  // Notes — STAFF and above
  if (notes !== undefined && !await can(req.admin.id, "notes")) {
    return res.status(403).json({ error: "You do not have permission to perform this action." });
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

  // JSONB payloads (quote_data, reply_channels) are admin-constructed but
  // still capped to prevent an oversized/malformed payload reaching the DB.
  const MAX_JSONB_BYTES = 200_000;
  for (const key of jsonbCols) {
    const val = req.body[key];
    if (val === undefined || val === null) continue;
    if (Buffer.byteLength(JSON.stringify(val), "utf8") > MAX_JSONB_BYTES) {
      return res.status(400).json({ error: `${key} payload is too large` });
    }
  }

  const updates = [];
  const values  = [];
  const textCols = { notes: 5000, closed_note: 2000 };

  for (const key of allowed) {
    let val = req.body[key];
    if (val === undefined) continue;

    // Skip null JSONB — leave existing DB value intact
    if (jsonbCols.includes(key) && val === null) continue;

    if (key in textCols && typeof val === "string") {
      val = cleanField(val, textCols[key]) ?? "";
    }

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

    // Audit log for status changes
    if (req.body.status) {
      await logAction(
        req.admin.id, req.admin.email,
        `STATUS_${req.body.status}`,
        req.params.id,
        `Status changed to ${req.body.status}`
      );
    } else if (req.body.quote_data) {
      await logAction(
        req.admin.id, req.admin.email,
        "QUOTE_SENT",
        req.params.id,
        "Quote built and sent"
      );
    }

    // Fire-and-forget — never let email sending delay or break the response.
    if (req.body.quote_data) {
      sendQuoteToCustomer(rows[0], req.body.quote_data).catch(err => console.error("Quote email error:", err.message));
    }

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
  // Hard delete is irreversible — restrict to the same roles that can close requests.
  if (!await can(req.admin.id, "close")) {
    return res.status(403).json({ error: "You do not have permission to perform this action." });
  }
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM quote_requests WHERE id = $1",
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Request not found" });

    await logAction(req.admin.id, req.admin.email, "REQUEST_DELETED", req.params.id, null);

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;