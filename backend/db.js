/**
 * db.js
 * PostgreSQL connection pool + schema init.
 * Run once on server start — creates all tables if they don't exist.
 */

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

/* ── Schema ──────────────────────────────────────────────────── */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS admins (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS quote_requests (
    id             VARCHAR(20)  PRIMARY KEY,
    name           TEXT         NOT NULL,
    phone          TEXT         NOT NULL,
    email          TEXT         NOT NULL,
    event          TEXT,
    location       TEXT,
    duration       VARCHAR(20),
    date           DATE,
    start_date     DATE,
    end_date       DATE,
    services       JSONB        NOT NULL DEFAULT '[]',
    tent_size      VARCHAR(20),
    tent_config    VARCHAR(20),
    other          TEXT,
    message        TEXT,
    status         VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    submitted_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    quoted_at      TIMESTAMPTZ,
    quote_data     JSONB,
    reply_channels JSONB        DEFAULT '{}',
    closed_reason  VARCHAR(20),
    closed_note    TEXT,
    notes          TEXT         NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS gallery (
    id            SERIAL PRIMARY KEY,
    filename      TEXT         NOT NULL,
    original_name TEXT,
    label         TEXT,
    type          VARCHAR(10)  NOT NULL,
    url           TEXT         NOT NULL,
    sort_order    INTEGER      NOT NULL DEFAULT 0,
    uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id          VARCHAR(20)  PRIMARY KEY,
    heading     TEXT         NOT NULL,
    content     TEXT         NOT NULL,
    image_url   TEXT,
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
`;

async function initDB() {
  try {
    await pool.query(SCHEMA);
    console.log("✓ Database schema ready");
  } catch (err) {
    console.error("✗ Schema init failed:", err.message);
    process.exit(1);
  }
}

module.exports = { pool, initDB };