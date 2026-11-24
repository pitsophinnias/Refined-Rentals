/**
 * lib/sessionSettings.js — how long admin logins last (System Admin → Security).
 *   maxHours:    a login ends this long after signing in, however active (default 8)
 *   idleMinutes: a login ends after this long with no activity; 0 = off (default)
 * Cached for 30 seconds because every authenticated request reads it.
 */

const { pool } = require("../db.js");

const DEFAULTS = { maxHours: 8, idleMinutes: 0 };
const MAX_HOURS_OPTIONS = [2, 4, 8, 12, 24, 72];
const IDLE_OPTIONS = [0, 15, 30, 60, 120, 240];

let cache = null, cachedAt = 0;

async function getSessionSettings() {
  if (cache && Date.now() - cachedAt < 30000) return cache;
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'session'");
  let v = {};
  try { v = rows[0] ? JSON.parse(rows[0].value) : {}; } catch { v = {}; }
  cache = {
    maxHours: MAX_HOURS_OPTIONS.includes(v.maxHours) ? v.maxHours : DEFAULTS.maxHours,
    idleMinutes: IDLE_OPTIONS.includes(v.idleMinutes) ? v.idleMinutes : DEFAULTS.idleMinutes,
  };
  cachedAt = Date.now();
  return cache;
}

async function setSessionSettings({ maxHours, idleMinutes }) {
  if (!MAX_HOURS_OPTIONS.includes(maxHours) || !IDLE_OPTIONS.includes(idleMinutes)) {
    throw Object.assign(new Error("Invalid session settings"), { status: 400 });
  }
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('session', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({ maxHours, idleMinutes })]
  );
  cache = null;
  return getSessionSettings();
}

module.exports = { getSessionSettings, setSessionSettings, MAX_HOURS_OPTIONS, IDLE_OPTIONS, DEFAULTS };
