/**
 * scripts/make-sysadmin.js
 *
 * Gives an existing admin account the System Admin role.
 * Run once on the server from the backend folder:
 *
 *   node scripts/make-sysadmin.js you@example.com
 *
 * It prints every account and its role afterwards, and warns if no business
 * Admin is left (someone has to manage staff and business settings).
 */

require("dotenv").config();
const { pool } = require("../db.js");

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: node scripts/make-sysadmin.js <email>");
    process.exitCode = 1;
    return;
  }

  const { rows } = await pool.query("SELECT id, email FROM admins WHERE email = $1", [email]);
  if (rows.length === 0) {
    console.error(`No admin account with email ${email}. Create it first.`);
    process.exitCode = 1;
    return;
  }
  const admin = rows[0];

  await pool.query(
    `INSERT INTO admin_roles (admin_id, role) VALUES ($1, 'SYSADMIN')
     ON CONFLICT (admin_id) DO UPDATE SET role = 'SYSADMIN'`,
    [admin.id]
  );
  await pool.query(
    `INSERT INTO audit_log (admin_id, admin_email, action, entity, entity_id, detail)
     VALUES (NULL, 'server script', 'MAKE_SYSADMIN', 'admin', $1, $2)`,
    [String(admin.id), `${admin.email} made System Admin from the server`]
  );
  console.log(`✓ ${admin.email} is now System Admin.\n`);

  const { rows: all } = await pool.query(
    `SELECT a.id, a.email, COALESCE(r.role, 'ADMIN') AS role
     FROM admins a LEFT JOIN admin_roles r ON r.admin_id = a.id ORDER BY a.id`
  );
  console.table(all);
  if (!all.some(u => u.role === "ADMIN")) {
    console.warn("⚠ No business Admin account is left. Give the client's account the Admin role from the System Admin → Users page.");
  }
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
