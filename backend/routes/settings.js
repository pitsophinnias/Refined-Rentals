/**
 * routes/settings.js
 *
 * Users
 * GET    /api/settings/users              — list all admins + roles
 * POST   /api/settings/users              — create new admin user (ADMIN only)
 * PATCH  /api/settings/users/:id/role     — update role (ADMIN only)
 * PATCH  /api/settings/users/:id/password — reset password (ADMIN only)
 * DELETE /api/settings/users/:id          — deactivate (ADMIN only, can't delete self)
 *
 * Account (self)
 * PATCH  /api/settings/account/password   — change own password
 *
 * Notification emails
 * GET    /api/settings/notifications      — list
 * POST   /api/settings/notifications      — add
 * PATCH  /api/settings/notifications/:id  — toggle active
 * DELETE /api/settings/notifications/:id  — remove
 *
 * Audit log
 * GET    /api/settings/audit              — list (filterable by admin/entity)
 */

const router      = require("express").Router();
const bcrypt      = require("bcrypt");
const { pool }    = require("../db.js");
const requireAuth = require("../middleware/auth.js");

/* ── Helpers ─────────────────────────────────────────────────── */
async function isAdmin(adminId) {
  const { rows } = await pool.query(
    "SELECT role FROM admin_roles WHERE admin_id = $1",
    [adminId]
  );
  return rows.length === 0 || rows[0].role === "ADMIN"; // first user has no role row = ADMIN
}

async function logAction(pool, adminId, adminEmail, action, entity, entityId, detail) {
  try {
    await pool.query(
      `INSERT INTO audit_log (admin_id, admin_email, action, entity, entity_id, detail)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId || null, adminEmail || null, action, entity || null, entityId || null, detail || null]
    );
  } catch (e) {
    console.error("Audit log error:", e.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   USERS
══════════════════════════════════════════════════════════════ */

/* GET /api/settings/users */
router.get("/users", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.email, a.created_at,
             COALESCE(r.role, 'ADMIN') AS role
      FROM admins a
      LEFT JOIN admin_roles r ON r.admin_id = a.id
      ORDER BY a.created_at ASC
    `);
    res.json({ users: rows });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* POST /api/settings/users — create new user */
router.post("/users", requireAuth, async (req, res) => {
  if (!await isAdmin(req.admin.id)) {
    return res.status(403).json({ error: "Only admins can create users" });
  }

  const { email, password, role = "VIEWER" } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email address" });
  }
  if (!["ADMIN", "MANAGER", "FINANCE", "STAFF", "VIEWER"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const hash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      "INSERT INTO admins (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email.trim().toLowerCase(), hash]
    );
    const newUser = rows[0];

    // ADMIN gets no role row (default). All other roles get an explicit row.
    if (role !== "ADMIN") {
      await pool.query(
        "INSERT INTO admin_roles (admin_id, role) VALUES ($1, $2)",
        [newUser.id, role]
      );
    }

    await logAction(pool, req.admin.id, req.admin.email,
      "CREATE_USER", "admin", String(newUser.id),
      `Created user ${newUser.email} with role ${role}`
    );

    res.status(201).json({ user: { ...newUser, role } });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    console.error("Create user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* PATCH /api/settings/users/:id/role */
router.patch("/users/:id/role", requireAuth, async (req, res) => {
  if (!await isAdmin(req.admin.id)) {
    return res.status(403).json({ error: "Only admins can change roles" });
  }

  const { role } = req.body;
  if (!["ADMIN", "MANAGER", "FINANCE", "STAFF", "VIEWER"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const targetId = Number(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user ID" });

  try {
    if (role === "ADMIN") {
      await pool.query("DELETE FROM admin_roles WHERE admin_id = $1", [targetId]);
    } else {
      await pool.query(
        `INSERT INTO admin_roles (admin_id, role) VALUES ($1, $2)
         ON CONFLICT (admin_id) DO UPDATE SET role = $2`,
        [targetId, role]
      );
    }

    await logAction(pool, req.admin.id, req.admin.email,
      "CHANGE_ROLE", "admin", String(targetId),
      `Changed user ${targetId} role to ${role}`
    );

    res.json({ message: "Role updated", role });
  } catch (err) {
    console.error("Change role error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* PATCH /api/settings/users/:id/password — admin resets another user's password */
router.patch("/users/:id/password", requireAuth, async (req, res) => {
  if (!await isAdmin(req.admin.id)) {
    return res.status(403).json({ error: "Only admins can reset passwords" });
  }

  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const targetId = Number(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user ID" });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rowCount } = await pool.query(
      "UPDATE admins SET password_hash = $1 WHERE id = $2",
      [hash, targetId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "User not found" });

    await logAction(pool, req.admin.id, req.admin.email,
      "RESET_PASSWORD", "admin", String(targetId),
      `Password reset for user ${targetId}`
    );

    res.json({ message: "Password updated" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* DELETE /api/settings/users/:id — remove user (can't delete self) */
router.delete("/users/:id", requireAuth, async (req, res) => {
  if (!await isAdmin(req.admin.id)) {
    return res.status(403).json({ error: "Only admins can remove users" });
  }

  const targetId = Number(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user ID" });
  if (targetId === req.admin.id) return res.status(400).json({ error: "You cannot remove your own account" });

  try {
    const { rows } = await pool.query("SELECT email FROM admins WHERE id = $1", [targetId]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    await pool.query("DELETE FROM admins WHERE id = $1", [targetId]);

    await logAction(pool, req.admin.id, req.admin.email,
      "DELETE_USER", "admin", String(targetId),
      `Removed user ${rows[0].email}`
    );

    res.json({ message: "User removed" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ══════════════════════════════════════════════════════════════
   ACCOUNT (self)
══════════════════════════════════════════════════════════════ */

/* PATCH /api/settings/account/password */
router.patch("/account/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "New password must be different from current" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT password_hash FROM admins WHERE id = $1",
      [req.admin.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Account not found" });

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE admins SET password_hash = $1 WHERE id = $2", [hash, req.admin.id]);

    await logAction(pool, req.admin.id, req.admin.email,
      "CHANGE_OWN_PASSWORD", "admin", String(req.admin.id),
      "Admin changed their own password"
    );

    res.json({ message: "Password updated" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ══════════════════════════════════════════════════════════════
   NOTIFICATION EMAILS
══════════════════════════════════════════════════════════════ */

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM notification_emails ORDER BY created_at ASC"
    );
    res.json({ emails: rows });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/notifications", requireAuth, async (req, res) => {
  const { email, label } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: "Email is required" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO notification_emails (email, label) VALUES ($1, $2) RETURNING *",
      [email.trim().toLowerCase(), label?.trim() || null]
    );

    await logAction(pool, req.admin.id, req.admin.email,
      "ADD_NOTIFICATION_EMAIL", "notification_emails", String(rows[0].id),
      `Added notification email ${rows[0].email}`
    );

    res.status(201).json({ email: rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/notifications/:id", requireAuth, async (req, res) => {
  const { active } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE notification_emails SET active = $1 WHERE id = $2 RETURNING *",
      [active, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ email: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/notifications/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT email FROM notification_emails WHERE id = $1", [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });

    await pool.query("DELETE FROM notification_emails WHERE id = $1", [req.params.id]);

    await logAction(pool, req.admin.id, req.admin.email,
      "REMOVE_NOTIFICATION_EMAIL", "notification_emails", req.params.id,
      `Removed notification email ${rows[0].email}`
    );

    res.json({ message: "Removed" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ══════════════════════════════════════════════════════════════
   AUDIT LOG
══════════════════════════════════════════════════════════════ */

router.get("/audit", requireAuth, async (req, res) => {
  const { admin_id, entity_id, limit = 50, offset = 0 } = req.query;

  const conditions = [];
  const values     = [];

  if (admin_id) {
    values.push(admin_id);
    conditions.push(`admin_id = $${values.length}`);
  }
  if (entity_id) {
    values.push(entity_id);
    conditions.push(`entity_id = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(Math.min(Number(limit), 200));
  values.push(Number(offset));

  try {
    const { rows } = await pool.query(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    const { rows: total } = await pool.query(
      `SELECT COUNT(*) FROM audit_log ${where}`,
      values.slice(0, -2)
    );
    res.json({ log: rows, total: Number(total[0].count) });
  } catch (err) {
    console.error("Audit log error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;