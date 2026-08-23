/**
 * lib/roles.js
 * Single source of truth for role → permission mapping, used by every route
 * that needs a server-side authorisation check. Mirrored on the frontend in
 * admin-dashboard/src/usePermissions.js — keep both in sync.
 */

const { pool } = require("../db.js");

const ROLES = {
  ADMIN:   ["view","review","quote","close","notes","gallery","announcements","users","activity","notifications","settings"],
  MANAGER: ["view","review","quote","close","notes","gallery","announcements","activity","notifications","settings"],
  FINANCE: ["view","quote","close","notifications"],
  STAFF:   ["view","review","notes","notifications"],
  VIEWER:  ["view"],
};

async function getRole(adminId) {
  const { rows } = await pool.query("SELECT role FROM admin_roles WHERE admin_id = $1", [adminId]);
  return rows.length === 0 ? "ADMIN" : rows[0].role; // first user has no role row = ADMIN
}

async function can(adminId, permission) {
  const role = await getRole(adminId);
  return (ROLES[role] || ROLES.VIEWER).includes(permission);
}

module.exports = { ROLES, getRole, can };
