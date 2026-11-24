/**
 * server.js
 * Refined Rentals — Local Express + PostgreSQL API
 * Runs on http://localhost:3001
 */

require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path         = require("path");
const { pool, initDB, initSettingsDB } = require("./db.js");
const { requestErrorContext, enableErrorLog } = require("./lib/errorLog.js");
const { originWatch } = require("./lib/originWatch.js");

const app     = express();
// Behind Nginx on the VPS: trust the proxy so req.ip and the rate limiters see the real client IP
app.set("trust proxy", 1);
const PORT    = process.env.PORT || 3001;
const isProd  = process.env.NODE_ENV === "production";

/* ── Validate JWT secret strength on startup ─────────────────── */
const JWT_SECRET = process.env.JWT_SECRET || "";
if (JWT_SECRET.length < 32) {
  console.error("✗ JWT_SECRET must be at least 32 characters. Update your .env file.");
  process.exit(1);
}

/* ── Error capture for the System Admin's Errors page ────────── */
app.use(requestErrorContext);

/* ── Helmet — security headers ───────────────────────────────── */
// This server only ever returns JSON (plus static files under /uploads), so
// a strict default CSP costs nothing. It does NOT govern the separately
// hosted React frontends — their own CSP must be set where they're served
// from (Render static site headers / Cloudflare), not here.
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow frontend to load uploaded images
  frameguard: { action: "deny" }, // this API is never meant to be framed
}));

/* ── CORS — only allow known origins ─────────────────────────── */
const allowedOrigins = [
  ...(isProd ? [] : ["http://localhost:5173", "http://localhost:5174"]),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. curl, Postman in dev)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods:     ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  // X-Background marks the dashboard's automatic refresh (see middleware/auth.js)
  allowedHeaders: ["Content-Type", "Authorization", "X-Background"],
  credentials: true, // needed for cookie support
}));

/* ── Body parsers — tight limits ──────────────────────────────── */
app.use(express.json({ limit: "1mb" }));         // JSON payloads — 1mb max
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
// File uploads use their own multer limit (50mb) defined in gallery route

/* ── Cookie parser ───────────────────────────────────────────── */
app.use(cookieParser());

/* ── Rate limiting — global ───────────────────────────────────── */
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             100,             // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: "Too many requests, please try again later." },
  skip: (req) => req.path === "/api/auth/me" || req.path === "/api/health" || req.path === "/api/status",
});
app.use(globalLimiter);

/* ── Rate limiting — login ───────────────────────────────────────
 * The real lockout (5 per IP / 10 per email in 15 min, clearable from the
 * System Admin's Security page) lives in routes/auth.js. This in-memory
 * limiter is only a backstop against floods, so it's set higher. */
const loginLimiter = rateLimit({
  windowMs:               15 * 60 * 1000,
  max:                    30,
  standardHeaders:        true,
  legacyHeaders:          false,
  message:                { error: "Too many login attempts. Please wait 15 minutes before trying again." },
  skipSuccessfulRequests: true, // only count failed attempts toward the limit
});
app.use("/api/auth/login", loginLimiter);

/* ── Static uploads — only allowed extensions ─────────────────── */
app.use("/uploads", (req, res, next) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$/i;
  if (!allowed.test(req.path)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}, express.static(path.join(__dirname, "uploads")));

/* ── Notice requests that bypass Cloudflare (Security page) ───── */
app.use("/api", originWatch);

/* ── Routes ──────────────────────────────────────────────────── */
app.use("/api/status",        require("./routes/status.js"));
app.use("/api/auth",          require("./routes/auth.js"));
app.use("/api/requests",      require("./routes/requests.js"));
app.use("/api/gallery",       require("./routes/gallery.js"));
app.use("/api/announcements", require("./routes/announcements.js"));
app.use("/api/settings",      require("./routes/settings.js"));
app.use("/api/system",        require("./routes/system.js"));

/* ── Health check ─────────────────────────────────────────────── */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ── 404 handler ──────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

/* ── Global error handler ─────────────────────────────────────── */
app.use((err, req, res, next) => {
  // CORS errors
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({ error: err.message });
  }
  // Client mistakes (malformed JSON, body too large...) are not server errors
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: status === 413 ? "Request too large." : "Invalid request." });
  }
  // Log full error internally — never expose stack to client
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
  res.status(500).json({
    error: isProd ? "An unexpected error occurred." : err.message,
  });
});

/* ── Start ────────────────────────────────────────────────────── */
async function start() {
  await initDB();
  await initSettingsDB();
  enableErrorLog(pool);
  // HOST=127.0.0.1 in production keeps the API reachable only through Nginx
  app.listen(PORT, process.env.HOST || undefined, () => {
    console.log(`\n✓ Refined Rentals API running on http://localhost:${PORT}`);
    console.log(`  Environment:   ${isProd ? "production" : "development"}`);
    console.log(`  Login limit:   5 failed / 15 min per IP, 10 per email`);
    console.log(`  Global limit:  100 req / 15 min per IP\n`);
  });
}

start();