/**
 * routes/system.js — System Admin (SYSADMIN) only
 *
 * GET  /api/system/overview                       — counts, recent users, recent security events
 * GET  /api/system/audit-actions                  — distinct audit actions (for the Audit Log filter)
 * GET  /api/system/health                         — backend, database, disk and service status
 * GET  /api/system/errors                         — server errors, grouped (?resolved=all, ?days=1|7|30)
 * POST /api/system/errors/resolve                 — mark error rows resolved { ids: [..] }
 * GET  /api/system/login-activity                 — recent logins, failures, last login per user
 * POST /api/system/users/:id/logout-everywhere    — end every session for that user
 */

const router      = require("express").Router();
const fs          = require("fs");
const path        = require("path");
const { execSync } = require("child_process");
const { pool }    = require("../db.js");
const requireAuth = require("../middleware/auth.js");
const { getRole, isSysadminRole } = require("../lib/roles.js");

async function requireSysadmin(req, res, next) {
  try {
    if (isSysadminRole(await getRole(req.admin.id))) return next();
    res.status(403).json({ error: "System admin access only." });
  } catch (err) {
    console.error("Sysadmin check error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

router.use(requireAuth, requireSysadmin);

// Account and permission changes, shown on the Overview like Lashes By
// Retha's "System Notifications".
const SECURITY_ACTIONS = [
  "CREATE_USER", "DELETE_USER", "CHANGE_ROLE", "RESET_PASSWORD",
  "CHANGE_OWN_PASSWORD", "MAKE_SYSADMIN", "LOGOUT_EVERYWHERE",
];

router.get("/overview", async (req, res) => {
  try {
    const [users, byRole, requests, announcements, gallery, audit7d, events] = await Promise.all([
      pool.query(`SELECT a.id, a.email, a.created_at, COALESCE(r.role, 'ADMIN') AS role
                  FROM admins a LEFT JOIN admin_roles r ON r.admin_id = a.id
                  ORDER BY a.created_at DESC`),
      pool.query(`SELECT COALESCE(r.role, 'ADMIN') AS role, COUNT(*)::int AS count
                  FROM admins a LEFT JOIN admin_roles r ON r.admin_id = a.id
                  GROUP BY 1`),
      pool.query(`SELECT COUNT(*)::int AS total,
                         COUNT(*) FILTER (WHERE status IN ('NEW','REVIEW'))::int AS open
                  FROM quote_requests`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE active)::int AS active, COUNT(*)::int AS total FROM announcements`),
      pool.query(`SELECT COUNT(*)::int AS total FROM gallery`),
      pool.query(`SELECT COUNT(*)::int AS count FROM audit_log WHERE created_at > NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT id, admin_email, action, entity_id, detail, created_at FROM audit_log
                  WHERE action = ANY($1) ORDER BY created_at DESC LIMIT 8`, [SECURITY_ACTIONS]),
    ]);

    res.json({
      counts: {
        users:          users.rows.length,
        byRole:         Object.fromEntries(byRole.rows.map(r => [r.role, r.count])),
        requests:       requests.rows[0].total,
        openRequests:   requests.rows[0].open,
        announcements:  announcements.rows[0].active,
        gallery:        gallery.rows[0].total,
        auditLast7Days: audit7d.rows[0].count,
      },
      recentUsers:    users.rows.slice(0, 5),
      securityEvents: events.rows,
    });
  } catch (err) {
    console.error("System overview error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/audit-actions", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT DISTINCT action FROM audit_log ORDER BY action");
    res.json({ actions: rows.map(r => r.action) });
  } catch (err) {
    console.error("Audit actions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── System Health ───────────────────────────────────────────── */

// Which commit is running, read once at startup (null if git isn't available)
let GIT_COMMIT = null;
try {
  GIT_COMMIT = execSync("git rev-parse --short HEAD", { cwd: __dirname, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch { /* not a git checkout */ }

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

async function folderSize(dir) {
  let total = 0;
  let entries = [];
  try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += await folderSize(p);
    else if (e.isFile()) { try { total += (await fs.promises.stat(p)).size; } catch { /* gone */ } }
  }
  return total;
}

async function audit(req, action, entityId, detail) {
  try {
    await pool.query(
      `INSERT INTO audit_log (admin_id, admin_email, action, entity, entity_id, detail) VALUES ($1, $2, $3, 'admin', $4, $5)`,
      [req.admin.id, req.admin.email, action, entityId, detail]
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

router.get("/health", async (req, res) => {
  const database = { reachable: false, responseTimeMs: null, sizeBytes: null, rowCounts: {} };
  try {
    const started = Date.now();
    await pool.query("SELECT 1");
    database.reachable = true;
    database.responseTimeMs = Date.now() - started;
    const tables = ["quote_requests", "announcements", "gallery", "admins", "audit_log", "login_events", "error_log"];
    const [size, ...counts] = await Promise.all([
      pool.query("SELECT pg_database_size(current_database()) AS size"),
      ...tables.map(t => pool.query(`SELECT COUNT(*)::int AS n FROM ${t}`)),
    ]);
    database.sizeBytes = Number(size.rows[0].size);
    tables.forEach((t, i) => { database.rowCounts[t] = counts[i].rows[0].n; });
  } catch (err) {
    console.error("Health check database error:", err);
  }

  let disk = null;
  try {
    const st = await fs.promises.statfs(UPLOADS_DIR);
    const total = st.blocks * st.bsize;
    const free = st.bavail * st.bsize;
    disk = { totalBytes: total, freeBytes: free, usedPercent: total ? Math.round(((total - free) / total) * 1000) / 10 : null };
  } catch { /* statfs unavailable */ }
  const uploadsBytes = await folderSize(UPLOADS_DIR);

  let errorsLast24h = 0, failedLoginsLast24h = 0, emailRecipients = 0;
  try {
    const [e, f, n] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM error_log WHERE created_at > NOW() - INTERVAL '24 hours' AND resolved_at IS NULL"),
      pool.query("SELECT COUNT(*)::int AS n FROM login_events WHERE success = FALSE AND created_at > NOW() - INTERVAL '24 hours'"),
      pool.query("SELECT COUNT(*)::int AS n FROM notification_emails WHERE active = TRUE"),
    ]);
    errorsLast24h = e.rows[0].n; failedLoginsLast24h = f.rows[0].n; emailRecipients = n.rows[0].n;
  } catch (err) {
    console.error("Health check counts error:", err);
  }

  const services = {
    email: { configured: Boolean(process.env.RESEND_API_KEY), sender: Boolean(process.env.EMAIL_FROM), extraRecipients: emailRecipients },
  };

  const warnings = [];
  if (!database.reachable) warnings.push("The database is not reachable.");
  if (disk?.usedPercent > 85) warnings.push(`The server disk is ${disk.usedPercent}% full.`);
  if (errorsLast24h > 0) warnings.push(`${errorsLast24h} unresolved server error${errorsLast24h === 1 ? "" : "s"} in the last 24 hours.`);
  if (failedLoginsLast24h >= 10) warnings.push(`${failedLoginsLast24h} failed logins in the last 24 hours.`);
  if (!services.email.configured) warnings.push("Email isn't configured (RESEND_API_KEY missing), so quote notifications won't send.");
  else if (!services.email.sender) warnings.push("EMAIL_FROM isn't set, so emails use the test sender and may not reach customers.");

  const mem = process.memoryUsage();
  res.json({
    status: warnings.length === 0 ? "ok" : "warning",
    warnings,
    backend: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || "development",
      version: GIT_COMMIT,
      memory: { rssMb: Math.round(mem.rss / 1048576), heapUsedMb: Math.round(mem.heapUsed / 1048576) },
    },
    database,
    disk,
    uploadsBytes,
    errorsLast24h,
    failedLoginsLast24h,
    services,
  });
});

/* ── Errors ─────────────────────────────────────────────────────
 * Identical errors are grouped with a count, newest first, so one recurring
 * problem doesn't bury everything else.
 */
router.get("/errors", async (req, res) => {
  const onlyUnresolved = req.query.resolved !== "all";
  const days = ["1", "7", "30"].includes(req.query.days) ? Number(req.query.days) : null;
  try {
    const { rows } = await pool.query(
      `SELECT context, message, route, method, status,
              COUNT(*)::int AS count, MAX(created_at) AS last_seen, MIN(created_at) AS first_seen,
              BOOL_AND(resolved_at IS NOT NULL) AS resolved,
              array_agg(id ORDER BY created_at DESC) AS ids
       FROM error_log
       WHERE ($1::boolean = FALSE OR resolved_at IS NULL)
         AND ($2::int IS NULL OR created_at >= NOW() - make_interval(days => $2::int))
       GROUP BY context, message, route, method, status
       ORDER BY last_seen DESC
       LIMIT 200`,
      [onlyUnresolved, days]
    );
    res.json({ errors: rows });
  } catch (err) {
    console.error("Error log list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/errors/resolve", async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 5000 || !ids.every(Number.isInteger)) {
    return res.status(400).json({ error: "ids must be a non-empty array of numbers" });
  }
  try {
    const { rowCount } = await pool.query("UPDATE error_log SET resolved_at = NOW() WHERE id = ANY($1) AND resolved_at IS NULL", [ids]);
    await audit(req, "ERRORS_RESOLVED", null, `Marked ${rowCount} error log row${rowCount === 1 ? "" : "s"} resolved`);
    res.json({ resolved: rowCount });
  } catch (err) {
    console.error("Error resolve error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── Login Activity ──────────────────────────────────────────── */
router.get("/login-activity", async (req, res) => {
  try {
    const [recent, failed24h, byUser] = await Promise.all([
      pool.query(`SELECT id, admin_id, email, success, ip, user_agent, created_at FROM login_events ORDER BY created_at DESC LIMIT 100`),
      pool.query(`SELECT COUNT(*)::int AS n FROM login_events WHERE success = FALSE AND created_at > NOW() - INTERVAL '24 hours'`),
      pool.query(`SELECT a.id, a.email, COALESCE(r.role, 'ADMIN') AS role,
                         (SELECT MAX(created_at) FROM login_events l WHERE l.admin_id = a.id AND l.success) AS last_login_at,
                         (SELECT COUNT(*)::int FROM login_events l WHERE l.admin_id = a.id AND NOT l.success
                            AND l.created_at > NOW() - INTERVAL '24 hours') AS failed_24h
                  FROM admins a LEFT JOIN admin_roles r ON r.admin_id = a.id
                  ORDER BY a.email`),
    ]);
    res.json({ recent: recent.rows, failedLast24h: failed24h.rows[0].n, users: byUser.rows });
  } catch (err) {
    console.error("Login activity error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/users/:id/logout-everywhere", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const { rows } = await pool.query(
      "UPDATE admins SET token_version = token_version + 1 WHERE id = $1 RETURNING email", [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    await audit(req, "LOGOUT_EVERYWHERE", String(id), `Signed ${rows[0].email} out of every device`);
    res.json({ message: "Signed out everywhere", self: id === req.admin.id });
  } catch (err) {
    console.error("Logout everywhere error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
