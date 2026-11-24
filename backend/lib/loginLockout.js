/**
 * lib/loginLockout.js — blocks repeated failed logins, worked out from the
 * login_events table so the System Admin can see and clear lockouts.
 *
 *   - 5 failed attempts from one IP address in 15 minutes  → that IP is blocked
 *   - 10 failed attempts against one email in 15 minutes   → that email is blocked
 *     (catches guessing spread over many addresses)
 *
 * A block lifts by itself 15 minutes after the last failure, or straight away
 * when a System Admin clears it. A successful login clears only the earlier
 * failures from that same IP for that same email (the person's own typos),
 * never anyone else's, so a real sign-in can't unblock an attacker.
 */

const { pool } = require("../db.js");

const WINDOW_MINUTES = 15;
const IP_LIMIT = 5;
const EMAIL_LIMIT = 10;

const norm = (email) => String(email || "").trim().toLowerCase().slice(0, 255);

async function lockStatus(ip, email) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE ip = $1)::int    AS ip_fails,
       COUNT(*) FILTER (WHERE email = $2)::int AS email_fails,
       MAX(created_at) FILTER (WHERE ip = $1 OR email = $2) AS last_fail
     FROM login_events
     WHERE success = FALSE AND cleared = FALSE
       AND created_at > NOW() - make_interval(mins => $3)
       AND (ip = $1 OR email = $2)`,
    [ip, norm(email), WINDOW_MINUTES]
  );
  const r = rows[0];
  const locked = r.ip_fails >= IP_LIMIT || r.email_fails >= EMAIL_LIMIT;
  const minutesLeft = locked && r.last_fail
    ? Math.max(1, Math.ceil((new Date(r.last_fail).getTime() + WINDOW_MINUTES * 60000 - Date.now()) / 60000))
    : 0;
  return { locked, minutesLeft };
}

async function clearFailures({ ip, email }) {
  const { rowCount } = await pool.query(
    `UPDATE login_events SET cleared = TRUE
     WHERE success = FALSE AND cleared = FALSE AND (($1::text IS NOT NULL AND ip = $1) OR ($2::text IS NOT NULL AND email = $2))`,
    [ip || null, email ? norm(email) : null]
  );
  return rowCount;
}

async function clearOwnFailures(ip, email) {
  await pool.query(
    `UPDATE login_events SET cleared = TRUE WHERE success = FALSE AND cleared = FALSE AND ip = $1 AND email = $2`,
    [ip, norm(email)]
  );
}

// Everything currently blocked, for the Security page
async function currentLockouts() {
  const q = (col, limit) => pool.query(
    `SELECT ${col} AS value, COUNT(*)::int AS failures, MAX(created_at) AS last_failure
     FROM login_events
     WHERE success = FALSE AND cleared = FALSE AND ${col} IS NOT NULL AND ${col} <> ''
       AND created_at > NOW() - make_interval(mins => $1)
     GROUP BY ${col} HAVING COUNT(*) >= $2 ORDER BY MAX(created_at) DESC`,
    [WINDOW_MINUTES, limit]
  );
  const [ips, emails] = await Promise.all([q("ip", IP_LIMIT), q("email", EMAIL_LIMIT)]);
  const until = (t) => new Date(new Date(t).getTime() + WINDOW_MINUTES * 60000);
  return [
    ...ips.rows.map(r => ({ type: "ip", value: r.value, failures: r.failures, lastFailure: r.last_failure, blockedUntil: until(r.last_failure) })),
    ...emails.rows.map(r => ({ type: "email", value: r.value, failures: r.failures, lastFailure: r.last_failure, blockedUntil: until(r.last_failure) })),
  ];
}

module.exports = { lockStatus, clearFailures, clearOwnFailures, currentLockouts, WINDOW_MINUTES, IP_LIMIT, EMAIL_LIMIT };
