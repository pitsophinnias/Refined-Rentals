/**
 * routes/system.js — System Admin (SYSADMIN) only
 *
 * GET /api/system/overview       — counts, recent users, recent security events
 * GET /api/system/audit-actions  — distinct audit actions (for the Audit Log filter)
 */

const router      = require("express").Router();
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
  "CHANGE_OWN_PASSWORD", "MAKE_SYSADMIN",
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

module.exports = router;
