/**
 * middleware/auth.js
 * Reads JWT from Authorization: Bearer header.
 * Attaches req.admin = { id, email } on success.
 */

const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin     = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
};