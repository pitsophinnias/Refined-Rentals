/**
 * lib/errorLog.js — records server errors in the error_log table for the
 * System Admin's Errors page (modeled on Lashes By Retha's error log).
 *
 * Rather than editing every catch block, this wraps console.error once:
 * everything the routes already log with console.error is still printed as
 * before, and is also saved. Inside a request, the row is written when the
 * response finishes, so it carries the route pattern, method and status.
 * Outside a request (e.g. a background email failure) it's written at once.
 *
 * Messages are scrubbed of emails, phone numbers and secrets before saving.
 */

const { AsyncLocalStorage } = require("async_hooks");

const RETENTION_DAYS = 30;
const MAX_ROWS = 2000;
const MAX_LENGTH = 500;

const als = new AsyncLocalStorage();
const originalError = console.error.bind(console);
let pool = null;          // set by enableErrorLog() once the DB is ready
let writing = false;      // never log our own logging failures recursively

const PATTERNS = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]"],
  [/\+?\d[\d\s\-.()]{6,}\d/g, "[redacted-number]"],
  [/\bBearer\s+\S+/gi, "[redacted-token]"],
  [/\b(password|pass|secret|token|api[_-]?key|private[_-]?key|authorization|hash)\b\s*[:=]\s*\S+/gi, "$1=[redacted]"],
  [/postgres(?:ql)?:\/\/\S+/gi, "[redacted-connection-string]"],
];

function sanitize(text) {
  let out = String(text == null ? "" : text);
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep);
  return out.slice(0, MAX_LENGTH);
}

function describe(arg) {
  if (arg instanceof Error) return arg.code ? `${arg.message} (${arg.code})` : arg.message;
  if (typeof arg === "string") return arg;
  try { return JSON.stringify(arg); } catch { return String(arg); }
}

// console.error("Login error:", err) → context "Login error", message err.message
function parse(args) {
  if (args.length > 1 && typeof args[0] === "string") {
    return { context: args[0].replace(/[:\s]+$/, ""), message: args.slice(1).map(describe).join(" ") };
  }
  return { context: null, message: args.map(describe).join(" ") };
}

function routeOf(req) {
  if (!req) return null;
  if (req.route?.path) return `${req.baseUrl || ""}${req.route.path === "/" ? "" : req.route.path}` || "/";
  return (req.originalUrl || req.url || "").split("?")[0] || null;
}

async function insert(row) {
  if (!pool || writing) return;
  writing = true;
  try {
    await pool.query(
      `INSERT INTO error_log (context, message, route, method, status, admin_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.context && sanitize(row.context).slice(0, 255), sanitize(row.message), row.route && sanitize(row.route).slice(0, 255),
       row.method || null, row.status || null, row.adminId || null]
    );
  } catch (err) {
    originalError("Failed to write error_log row:", err.message);
  } finally {
    writing = false;
  }
}

function capture(args) {
  if (writing) return;
  const { context, message } = parse(args);
  const store = als.getStore();
  if (store && !store.finished) {
    store.pending.push({ context, message });  // written on finish, with the status
    return;
  }
  const req = store?.req;
  insert({ context, message, route: routeOf(req), method: req?.method, status: store?.res?.statusCode, adminId: req?.admin?.id });
}

console.error = (...args) => {
  originalError(...args);
  try { capture(args); } catch { /* logging must never break the caller */ }
};

/* Express middleware: gives each request its own error bucket */
function requestErrorContext(req, res, next) {
  const store = { req, res, pending: [], finished: false };
  res.on("finish", () => {
    store.finished = true;
    for (const e of store.pending) {
      insert({ ...e, route: routeOf(req), method: req.method, status: res.statusCode, adminId: req.admin?.id });
    }
    store.pending = [];
  });
  als.run(store, next);
}

async function cleanup() {
  if (!pool) return;
  try {
    await pool.query(`DELETE FROM error_log WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`);
    await pool.query(`DELETE FROM error_log WHERE id NOT IN (SELECT id FROM error_log ORDER BY created_at DESC LIMIT ${MAX_ROWS})`);
    await pool.query(`DELETE FROM login_events WHERE created_at < NOW() - INTERVAL '180 days'`);
  } catch (err) {
    originalError("Error log cleanup failed:", err.message);
  }
}

// Call after the schema is ready. Starts saving errors and the daily cleanup.
function enableErrorLog(dbPool) {
  pool = dbPool;
  cleanup();
  setInterval(cleanup, 24 * 60 * 60 * 1000).unref();
}

module.exports = { requestErrorContext, enableErrorLog, sanitize, RETENTION_DAYS };
