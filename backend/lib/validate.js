/**
 * lib/validate.js
 * Shared input sanitisation/validation helpers used across routes.
 */

const sanitizeHtml = require("sanitize-html");

// Strip all HTML/script tags — every text field in this app is plain text,
// never rendered as HTML, so the allow-list is empty on purpose.
function cleanText(value) {
  if (typeof value !== "string") return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

// Sanitise then enforce a max length. Returns null for empty/undefined input.
function cleanField(value, maxLen) {
  if (value === undefined || value === null) return null;
  const cleaned = cleanText(String(value));
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, maxLen);
}

// YYYY-MM-DD (HTML date input format) and a real calendar date.
function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// services: array of { name, qty } — cap array size, string length, and qty range.
function cleanServices(services, { maxItems = 50, maxNameLen = 100, maxQty = 999 } = {}) {
  if (!Array.isArray(services)) return null;
  return services.slice(0, maxItems).map(s => {
    if (s && typeof s === "object") {
      const name = cleanField(s.name, maxNameLen) || "";
      let qty = Number(s.qty);
      if (!Number.isFinite(qty) || qty < 1) qty = 1;
      qty = Math.min(Math.trunc(qty), maxQty);
      return { name, qty };
    }
    // Legacy plain-string service entries
    return cleanField(s, maxNameLen) || "";
  });
}

module.exports = { cleanText, cleanField, isValidDate, cleanServices };
