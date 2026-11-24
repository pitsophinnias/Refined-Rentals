/**
 * middleware/auth.js
 * Reads JWT from Authorization: Bearer header.
 * Attaches req.admin = { id, email } on success.
 *
 * Also checks the account still exists and that the token's version matches
 * admins.token_version, so "log out everywhere" (which bumps that number)
 * and removing a user both end their sessions on the very next request.
 * Tokens issued before token_version existed carry no version and count as 0.
 */

const jwt = require("jsonwebtoken");
const { pool } = require("../db.js");
require("dotenv").config();

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
    const { rows } = await pool.query("SELECT token_version FROM admins WHERE id = $1", [payload.id]);
    if (rows.length === 0) return res.status(401).json({ error: "This account no longer exists" });
    if ((payload.tv || 0) !== rows[0].token_version) {
      return res.status(401).json({ error: "Your session was ended. Please sign in again." });
    }
  } catch (err) {
    console.error("Auth session check error:", err);
    return res.status(500).json({ error: "Server error" });
  }

  req.admin = { id: payload.id, email: payload.email };
  next();
};
