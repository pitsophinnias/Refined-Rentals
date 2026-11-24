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
 * GET  /api/system/controls                       — maintenance mode state
 * PATCH /api/system/maintenance                   — turn maintenance on/off { enabled, message }
 * GET  /api/system/backups                        — backup runs, files on disk, warnings
 * POST /api/system/backups/run                    — start a backup now
 * GET  /api/system/backups/files/:name            — download one backup file
 * GET  /api/system/security                       — checklist, server checks, passwords, lockouts, sessions (?fresh=1 re-runs server checks)
 * POST /api/system/security/users/:id/password-change — { required } force (or cancel) a password change at next sign-in
 * POST /api/system/security/lockouts/clear        — { type: "ip"|"email", value } unblock
 * PATCH /api/system/security/session              — { maxHours, idleMinutes }
 */

const router      = require("express").Router();
const fs          = require("fs");
const path        = require("path");
const { execSync, spawn } = require("child_process");
const { getMaintenance, setMaintenance } = require("../lib/systemSettings.js");
const { BACKUP_DIR, KEEP_DAYS, FILE_RE, listBackupFiles } = require("../lib/backups.js");
const { serverChecks } = require("../lib/serverChecks.js");
const { currentLockouts, clearFailures, WINDOW_MINUTES, IP_LIMIT, EMAIL_LIMIT } = require("../lib/loginLockout.js");
const { getSessionSettings, setSessionSettings, MAX_HOURS_OPTIONS, IDLE_OPTIONS } = require("../lib/sessionSettings.js");
const { directTraffic } = require("../lib/originWatch.js");
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
  "MAINTENANCE_ON", "MAINTENANCE_OFF", "BACKUP_DOWNLOADED",
  "FORCE_PASSWORD_CHANGE", "LOCKOUT_CLEARED", "SESSION_SETTINGS_CHANGED",
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

  let backup = { setUp: false, lastSuccessAt: null, lastStatus: null };
  try {
    const { rows } = await pool.query(
      `SELECT (SELECT MAX(finished_at) FROM backup_runs WHERE status = 'success') AS last_success,
              (SELECT status FROM backup_runs ORDER BY finished_at DESC LIMIT 1) AS last_status,
              (SELECT COUNT(*)::int FROM backup_runs) AS runs`
    );
    backup = { setUp: rows[0].runs > 0, lastSuccessAt: rows[0].last_success, lastStatus: rows[0].last_status };
  } catch (err) {
    console.error("Health check backups error:", err);
  }
  let maintenance = { enabled: false };
  try { maintenance = await getMaintenance(); } catch (err) { console.error("Health check maintenance error:", err); }

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

  if (!backup.setUp) warnings.push("Automatic backups aren't set up yet.");
  else if (backup.lastStatus === "failed") warnings.push("The most recent backup failed.");
  else if (!backup.lastSuccessAt || Date.now() - new Date(backup.lastSuccessAt).getTime() > 26 * 3600 * 1000) warnings.push("No successful backup in the last 26 hours.");
  if (maintenance.enabled) warnings.push("Maintenance mode is ON: customers see the maintenance screen.");

  const mem = process.memoryUsage();
  res.json({
    backup,
    maintenance: { enabled: maintenance.enabled },
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
    await pool.query("UPDATE sessions SET revoked_at = NOW() WHERE admin_id = $1 AND revoked_at IS NULL", [id]);
    await audit(req, "LOGOUT_EVERYWHERE", String(id), `Signed ${rows[0].email} out of every device`);
    res.json({ message: "Signed out everywhere", self: id === req.admin.id });
  } catch (err) {
    console.error("Logout everywhere error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── System Controls: maintenance mode ───────────────────────── */
router.get("/controls", async (req, res) => {
  try {
    res.json({ maintenance: await getMaintenance() });
  } catch (err) {
    console.error("System controls error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/maintenance", async (req, res) => {
  const enabled = req.body?.enabled === true;
  const message = String(req.body?.message || "").trim().replace(/\s+/g, " ");
  if (!message) return res.status(400).json({ error: "A message for visitors is required." });
  if (message.length > 300) return res.status(400).json({ error: "Keep the message under 300 characters." });
  try {
    await setMaintenance({ enabled, message, updatedBy: req.admin.email });
    await audit(req, enabled ? "MAINTENANCE_ON" : "MAINTENANCE_OFF", null,
      enabled ? `Maintenance mode turned ON: "${message}"` : "Maintenance mode turned OFF");
    res.json({ maintenance: await getMaintenance() });
  } catch (err) {
    console.error("Maintenance update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── Backups ─────────────────────────────────────────────────── */
let manualRunStartedAt = 0;

router.get("/backups", async (req, res) => {
  try {
    const [{ rows: runs }, files] = await Promise.all([
      pool.query(`SELECT * FROM backup_runs ORDER BY finished_at DESC LIMIT 30`),
      listBackupFiles(),
    ]);
    const lastSuccess = runs.find(r => r.status === "success");
    const lastSuccessAt = lastSuccess?.finished_at || null;
    let warning = null;
    if (runs.length && runs[0].status === "failed") warning = "The most recent backup failed.";
    else if (runs.length && (!lastSuccessAt || Date.now() - new Date(lastSuccessAt).getTime() > 26 * 3600 * 1000)) warning = "No successful backup in the last 26 hours.";
    res.json({
      setUp: runs.length > 0,
      location: BACKUP_DIR,
      keepDays: KEEP_DAYS,
      lastSuccessAt,
      warning,
      running: Date.now() - manualRunStartedAt < 10 * 60 * 1000 && fs.existsSync(path.join(BACKUP_DIR, ".backup.lock")),
      runs,
      files,
    });
  } catch (err) {
    console.error("Backups list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/backups/run", async (req, res) => {
  if (fs.existsSync(path.join(BACKUP_DIR, ".backup.lock"))) {
    return res.status(409).json({ error: "A backup is already running." });
  }
  try {
    const child = spawn(process.execPath, [path.join(__dirname, "..", "scripts", "backup.js"), "--trigger=manual"], {
      cwd: path.join(__dirname, ".."), detached: true, stdio: "ignore",
    });
    child.unref();
    manualRunStartedAt = Date.now();
    await audit(req, "BACKUP_STARTED", null, "Started a manual backup");
    res.status(202).json({ message: "Backup started" });
  } catch (err) {
    console.error("Backup start error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/backups/files/:name", async (req, res) => {
  const name = req.params.name;
  if (!FILE_RE.test(name)) return res.status(400).json({ error: "Invalid file name" });
  const full = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(full)) return res.status(404).json({ error: "Backup not found" });
  await audit(req, "BACKUP_DOWNLOADED", null, `Downloaded ${name}`);
  res.download(full, name);
});

/* ── Security ─────────────────────────────────────────────────── */
const PASSWORD_MAX_AGE_DAYS = 180;

router.get("/security", async (req, res) => {
  try {
    const [session, lockouts, server, users, backups] = await Promise.all([
      getSessionSettings(),
      currentLockouts(),
      serverChecks(req.query.fresh === "1"),
      pool.query(`SELECT a.id, a.email, a.created_at, a.password_changed_at, a.must_change_password,
                         COALESCE(r.role, 'ADMIN') AS role,
                         (SELECT MAX(created_at) FROM login_events l WHERE l.admin_id = a.id AND l.success) AS last_login_at,
                         (SELECT COUNT(*)::int FROM sessions s WHERE s.admin_id = a.id AND s.revoked_at IS NULL
                            AND s.issued_at > NOW() - make_interval(hours => $1)
                            AND ($2::int = 0 OR s.last_seen_at > NOW() - make_interval(mins => $2::int))) AS open_sessions
                  FROM admins a LEFT JOIN admin_roles r ON r.admin_id = a.id ORDER BY a.email`,
                [(await getSessionSettings()).maxHours, (await getSessionSettings()).idleMinutes]),
      pool.query(`SELECT MAX(finished_at) FILTER (WHERE status = 'success') AS last_success, COUNT(*)::int AS runs FROM backup_runs`),
    ]);

    const c = (id, label, status, detail, fix) => ({ id, label, status, detail, fix: fix || null });
    const checklist = [];
    const isProd = process.env.NODE_ENV === "production";
    checklist.push(c("prod", "Running in production mode", isProd ? "pass" : "fail",
      isProd ? "NODE_ENV is production: error details are hidden from visitors." : `NODE_ENV is "${process.env.NODE_ENV || "not set"}".`,
      isProd ? null : "Set NODE_ENV=production in backend/.env and restart."));
    const jwtLen = (process.env.JWT_SECRET || "").length;
    checklist.push(c("jwt", "Login tokens use a strong secret", jwtLen >= 48 ? "pass" : "warn",
      `JWT_SECRET is ${jwtLen} characters long.`,
      jwtLen >= 48 ? null : "Generate a longer one (node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"), put it in backend/.env and restart. Everyone will need to sign in again."));
    const origins = (process.env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean);
    const insecure = origins.filter(o => !o.startsWith("https://"));
    checklist.push(c("origins", "Only the real websites can use the API", origins.length && !insecure.length ? "pass" : "warn",
      origins.length ? (insecure.length ? `Non-HTTPS origins allowed: ${insecure.join(", ")}.` : `Allowed: ${origins.join(", ")}.`) : "ALLOWED_ORIGINS is empty.",
      insecure.length || !origins.length ? "List only the https:// addresses of the two sites in ALLOWED_ORIGINS." : null));
    const from = process.env.EMAIL_FROM || "";
    checklist.push(c("email", "Emails come from your own domain", from && !/resend\.dev/i.test(from) ? "pass" : "warn",
      from && !/resend\.dev/i.test(from) ? "EMAIL_FROM uses your domain." : "Emails use Resend's test sender, which only reaches the account owner.",
      from && !/resend\.dev/i.test(from) ? null : "Set EMAIL_FROM to an address on refinedrentals.co.ls (verified in Resend)."));
    const lastBackup = backups.rows[0].last_success;
    const backupOk = lastBackup && Date.now() - new Date(lastBackup).getTime() < 26 * 3600 * 1000;
    checklist.push(c("backups", "Backups are running", backupOk ? "pass" : "fail",
      backups.rows[0].runs === 0 ? "No backup has run yet." : backupOk ? "A backup finished in the last 26 hours." : "No successful backup in the last 26 hours.",
      backupOk ? null : "See the Backups page."));
    const cf = req.headers["cf-connecting-ip"];
    checklist.push(c("realip", "Visitor IPs come through Cloudflare correctly",
      !cf ? "unknown" : cf === req.ip ? "pass" : "fail",
      !cf ? "Open this page through admin.refinedrentals.co.ls to check." : cf === req.ip ? "Nginx passes the real visitor IP, so login limits apply per person." : "Nginx isn't using Cloudflare's visitor IP, so every visitor looks like a Cloudflare address.",
      cf && cf !== req.ip ? "Add the Cloudflare set_real_ip_from list to Nginx (see PR 3 deploy notes)." : null));
    const dt = directTraffic();
    checklist.push(c("direct", "Nobody is reaching the server around Cloudflare", dt.count === 0 ? "pass" : "warn",
      dt.count === 0 ? `No direct requests to the API since ${new Date(dt.since).toISOString().slice(0, 16).replace("T", " ")} UTC (last restart).`
        : `${dt.count} API request${dt.count === 1 ? "" : "s"} reached the server without Cloudflare since the last restart (latest from ${dt.recent[0]?.ip}).`,
      dt.count === 0 ? null : "Restrict ports 80/443 in the firewall to Cloudflare's IP ranges."));
    checklist.push(c("idle", "Inactive logins time out", session.idleMinutes > 0 ? "pass" : "warn",
      session.idleMinutes > 0 ? `Logins end after ${session.idleMinutes} minutes without activity.` : "A login stays open until it expires, even on an unattended computer.",
      session.idleMinutes > 0 ? null : "Set an inactivity timeout below (60 minutes is a good start)."));
    const old = users.rows.filter(u => !u.password_changed_at || Date.now() - new Date(u.password_changed_at).getTime() > PASSWORD_MAX_AGE_DAYS * 86400000);
    checklist.push(c("passwords", "Passwords are recent", old.length === 0 ? "pass" : "warn",
      old.length === 0 ? `Every password was changed in the last ${PASSWORD_MAX_AGE_DAYS} days.` : `${old.length} account${old.length === 1 ? " hasn't" : "s haven't"} changed password in ${PASSWORD_MAX_AGE_DAYS} days (or since tracking began).`,
      old.length === 0 ? null : "Use Force password change below, or ask them to change it under Settings → My Account."));

    res.json({
      checklist,
      server,
      session: { ...session, maxHoursOptions: MAX_HOURS_OPTIONS, idleOptions: IDLE_OPTIONS },
      lockouts: { items: lockouts, windowMinutes: WINDOW_MINUTES, ipLimit: IP_LIMIT, emailLimit: EMAIL_LIMIT },
      users: users.rows,
      passwordMaxAgeDays: PASSWORD_MAX_AGE_DAYS,
      directTraffic: dt,
    });
  } catch (err) {
    console.error("Security page error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/security/users/:id/password-change", async (req, res) => {
  const id = Number(req.params.id);
  const required = req.body?.required === true;
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid user ID" });
  if (id === req.admin.id) return res.status(400).json({ error: "Change your own password under Settings" });
  try {
    // Forcing also signs them out, so they meet the change screen on their next sign-in
    const { rows } = await pool.query(
      `UPDATE admins SET must_change_password = $1, token_version = token_version + CASE WHEN $1 THEN 1 ELSE 0 END
       WHERE id = $2 RETURNING email`, [required, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    if (required) await pool.query("UPDATE sessions SET revoked_at = NOW() WHERE admin_id = $1 AND revoked_at IS NULL", [id]);
    await audit(req, "FORCE_PASSWORD_CHANGE", String(id),
      required ? `${rows[0].email} must change their password at next sign-in` : `Cancelled the forced password change for ${rows[0].email}`);
    res.json({ message: "Updated" });
  } catch (err) {
    console.error("Force password change error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/security/lockouts/clear", async (req, res) => {
  const { type, value } = req.body || {};
  if (!["ip", "email"].includes(type) || !value || String(value).length > 255) {
    return res.status(400).json({ error: "type must be ip or email, with a value" });
  }
  try {
    const n = await clearFailures(type === "ip" ? { ip: String(value) } : { email: String(value) });
    await audit(req, "LOCKOUT_CLEARED", null, `Unblocked ${type === "ip" ? "IP" : "email"} ${value} (${n} failed attempt${n === 1 ? "" : "s"} cleared)`);
    res.json({ cleared: n });
  } catch (err) {
    console.error("Clear lockout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/security/session", async (req, res) => {
  try {
    const before = await getSessionSettings();
    const after = await setSessionSettings({ maxHours: Number(req.body?.maxHours), idleMinutes: Number(req.body?.idleMinutes) });
    await audit(req, "SESSION_SETTINGS_CHANGED", null,
      `Session length ${before.maxHours}h → ${after.maxHours}h, inactivity timeout ${before.idleMinutes || "off"} → ${after.idleMinutes || "off"}${after.idleMinutes ? " min" : ""}`);
    res.json({ session: after });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error("Session settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
