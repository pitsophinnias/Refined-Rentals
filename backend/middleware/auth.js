/**
 * middleware/auth.js
 * Reads JWT from Authorization: Bearer header.
 * Attaches req.admin = { id, email } on success.
 *
 * On every request it also checks, against the database:
 *   - the account still exists and the token's version matches
 *     admins.token_version ("log out everywhere" / password reset bump it)
 *   - the login's session row isn't revoked (signed out) or idle for longer
 *     than the inactivity timeout, and the login isn't older than the maximum
 *     session length (System Admin → Security → Session settings)
 *   - a user who must change their password can only do that
 *
 * Requests sent with the header X-Background: 1 (the dashboard's automatic
 * refresh) are checked but don't count as activity, so an unattended
 * dashboard still times out. Tokens from before sessions existed carry no
 * session id and are accepted until they expire.
 */

const jwt = require("jsonwebtoken");
const { pool } = require("../db.js");
const { getSessionSettings } = require("../lib/sessionSettings.js");
require("dotenv").config();

// The only routes a user who must change their password can use
const PASSWORD_CHANGE_ROUTES = ["/api/auth/me", "/api/auth/logout", "/api/settings/account/password"];

module.exports = async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  try {
    const settings = await getSessionSettings();
    if (payload.iat && Date.now() - payload.iat * 1000 > settings.maxHours * 3600 * 1000) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again.", code: "SESSION_EXPIRED" });
    }

    const { rows } = await pool.query(
      `SELECT a.token_version, a.must_change_password, s.jti, s.last_seen_at, s.revoked_at
       FROM admins a LEFT JOIN sessions s ON s.jti = $2 AND s.admin_id = a.id
       WHERE a.id = $1`,
      [payload.id, payload.jti || null]
    );
    if (rows.length === 0) return res.status(401).json({ error: "This account no longer exists" });
    const row = rows[0];
    if ((payload.tv || 0) !== row.token_version) {
      return res.status(401).json({ error: "Your session was ended. Please sign in again." });
    }

    if (payload.jti) {
      if (!row.jti || row.revoked_at) {
        return res.status(401).json({ error: "You've been signed out. Please sign in again." });
      }
      const idleMs = Date.now() - new Date(row.last_seen_at).getTime();
      if (settings.idleMinutes > 0 && idleMs > settings.idleMinutes * 60000) {
        pool.query("UPDATE sessions SET revoked_at = NOW() WHERE jti = $1", [payload.jti]).catch(() => {});
        return res.status(401).json({ error: `Signed out after ${settings.idleMinutes} minutes of inactivity.`, code: "SESSION_IDLE" });
      }
      // Record activity (at most every 30s), unless it's an automatic refresh
      if (req.headers["x-background"] !== "1" && idleMs > 30000) {
        pool.query("UPDATE sessions SET last_seen_at = NOW() WHERE jti = $1", [payload.jti]).catch(() => {});
      }
    }

    if (row.must_change_password && !PASSWORD_CHANGE_ROUTES.some(p => req.originalUrl.split("?")[0] === p)) {
      return res.status(403).json({ error: "Please change your password to continue.", code: "PASSWORD_CHANGE_REQUIRED" });
    }
  } catch (err) {
    console.error("Auth session check error:", err);
    return res.status(500).json({ error: "Server error" });
  }

  req.admin = { id: payload.id, email: payload.email, jti: payload.jti || null };
  next();
};
