/**
 * lib/systemSettings.js — System Admin controls stored in the settings table.
 * Currently: maintenance mode { enabled, message }.
 */

const { pool } = require("../db.js");

const DEFAULT_MAINTENANCE_MESSAGE =
  "We're making some improvements to our website and will be back shortly. You can still reach us by phone or email.";

async function getMaintenance() {
  const { rows } = await pool.query("SELECT value, updated_at FROM settings WHERE key = 'maintenance'");
  let value = {};
  try { value = rows[0] ? JSON.parse(rows[0].value) : {}; } catch { value = {}; }
  return {
    enabled: value.enabled === true,
    message: value.message || DEFAULT_MAINTENANCE_MESSAGE,
    updatedBy: value.updatedBy || null,
    updatedAt: rows[0]?.updated_at || null,
  };
}

async function setMaintenance({ enabled, message, updatedBy }) {
  const value = JSON.stringify({ enabled: Boolean(enabled), message, updatedBy });
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('maintenance', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [value]
  );
}

module.exports = { getMaintenance, setMaintenance, DEFAULT_MAINTENANCE_MESSAGE };
