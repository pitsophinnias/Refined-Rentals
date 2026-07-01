/**
 * server.js
 * Refined Rentals — Local Express + PostgreSQL API
 * Runs on http://localhost:3001
 */

require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { initDB } = require("./db.js");

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── CORS ────────────────────────────────────────────────────── */
// Allow both Vite dev servers
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

/* ── Body parsers ────────────────────────────────────────────── */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ── Static file serving for uploads ────────────────────────── */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ── Routes ──────────────────────────────────────────────────── */
app.use("/api/auth",          require("./routes/auth.js"));
app.use("/api/requests",      require("./routes/requests.js"));
app.use("/api/gallery",       require("./routes/gallery.js"));
app.use("/api/announcements", require("./routes/announcements.js"));

/* ── Health check ────────────────────────────────────────────── */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ── 404 handler ─────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

/* ── Global error handler ────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Server error" });
});

/* ── Start ───────────────────────────────────────────────────── */
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n✓ Refined Rentals API running on http://localhost:${PORT}`);
    console.log(`  Health:        GET  http://localhost:${PORT}/api/health`);
    console.log(`  Requests:      GET  http://localhost:${PORT}/api/requests`);
    console.log(`  Gallery:       GET  http://localhost:${PORT}/api/gallery`);
    console.log(`  Announcements: GET  http://localhost:${PORT}/api/announcements/active\n`);
  });
}

start();