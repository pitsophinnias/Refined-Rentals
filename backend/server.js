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
const { initDB } = require("./db.js");

const app     = express();
const PORT    = process.env.PORT || 3001;
const isProd  = process.env.NODE_ENV === "production";

/* ── Validate JWT secret strength on startup ─────────────────── */
const JWT_SECRET = process.env.JWT_SECRET || "";
if (JWT_SECRET.length < 32) {
  console.error("✗ JWT_SECRET must be at least 32 characters. Update your .env file.");
  process.exit(1);
}

/* ── Helmet — security headers ───────────────────────────────── */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow frontend to load uploaded images
  contentSecurityPolicy: false, // handled by frontend framework
}));

/* ── CORS — only allow known origins ─────────────────────────── */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. curl, Postman in dev)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods:     ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
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
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              200,             // 200 requests per window per IP
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

/* ── Rate limiting — strict on login ─────────────────────────── */
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              5,               // 5 attempts per window per IP
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: "Too many login attempts. Please wait 15 minutes before trying again." },
  skipSuccessfulRequests: true,      // only count failed attempts
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

/* ── Routes ──────────────────────────────────────────────────── */
app.use("/api/auth",          require("./routes/auth.js"));
app.use("/api/requests",      require("./routes/requests.js"));
app.use("/api/gallery",       require("./routes/gallery.js"));
app.use("/api/announcements", require("./routes/announcements.js"));

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
  // Log full error internally — never expose stack to client
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
  res.status(500).json({
    error: isProd ? "An unexpected error occurred." : err.message,
  });
});

/* ── Start ────────────────────────────────────────────────────── */
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n✓ Refined Rentals API running on http://localhost:${PORT}`);
    console.log(`  Environment:   ${isProd ? "production" : "development"}`);
    console.log(`  Login limit:   5 attempts / 15 min per IP`);
    console.log(`  Global limit:  200 req / 15 min per IP\n`);
  });
}

start();