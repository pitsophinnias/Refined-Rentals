/**
 * db.js
 * PostgreSQL connection pool + schema init.
 * Run once on server start — creates all tables if they don't exist.
 */

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host:     process.env.DB_HOST,
        port:     Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

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

  -- Distinguishes customer-website submissions from requests an admin enters
  -- manually on behalf of a client who contacted via WhatsApp/call.
  ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'website';
  -- Manual entries may not have a customer email on hand.
  ALTER TABLE quote_requests ALTER COLUMN email DROP NOT NULL;

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

  -- "main" = homepage slideshow, "contact" = contact section images
  ALTER TABLE gallery ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'main';

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

/* ── Additional tables (added for Settings) ──────────────────── */
const SETTINGS_SCHEMA = `
  -- Roles: ADMIN (full access) | VIEWER (read-only)
  CREATE TABLE IF NOT EXISTS admin_roles (
    id         SERIAL PRIMARY KEY,
    admin_id   INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(admin_id)
  );

  -- Notification emails — extra addresses to CC on new quote alerts
  CREATE TABLE IF NOT EXISTS notification_emails (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    label      TEXT,
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Audit log — every significant admin action
  CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    admin_id    INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    admin_email TEXT,
    action      TEXT NOT NULL,
    entity      TEXT,
    entity_id   TEXT,
    detail      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Bumped by "log out everywhere": tokens carrying an older number stop working
  ALTER TABLE admins ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

  -- Password health (System Admin → Security)
  ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
  ALTER TABLE admins ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

  -- One row per login, so the server can enforce idle timeout and max session
  -- length and revoke a single session on sign-out
  CREATE TABLE IF NOT EXISTS sessions (
    jti          VARCHAR(64) PRIMARY KEY,
    admin_id     INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at   TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS sessions_admin_idx ON sessions (admin_id);

  -- Every admin login attempt, for the System Admin's Login Activity page
  CREATE TABLE IF NOT EXISTS login_events (
    id          SERIAL PRIMARY KEY,
    admin_id    INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    email       VARCHAR(255),
    success     BOOLEAN NOT NULL,
    ip          VARCHAR(64),
    user_agent  VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS login_events_created_idx ON login_events (created_at DESC);
  -- Failed attempts a System Admin has cleared (unblocked) stop counting
  ALTER TABLE login_events ADD COLUMN IF NOT EXISTS cleared BOOLEAN NOT NULL DEFAULT FALSE;

  -- Server errors, for the System Admin's Errors page (see lib/errorLog.js)
  CREATE TABLE IF NOT EXISTS error_log (
    id          SERIAL PRIMARY KEY,
    context     VARCHAR(255),
    message     TEXT,
    route       VARCHAR(255),
    method      VARCHAR(10),
    status      INTEGER,
    admin_id    INTEGER,
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS error_log_created_idx ON error_log (created_at DESC);

  -- One row per backup run (written by scripts/backup.js)
  CREATE TABLE IF NOT EXISTS backup_runs (
    id            SERIAL PRIMARY KEY,
    started_at    TIMESTAMPTZ NOT NULL,
    finished_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status        VARCHAR(10) NOT NULL,
    triggered_by  VARCHAR(20),
    db_file       VARCHAR(255),
    db_bytes      BIGINT,
    uploads_file  VARCHAR(255),
    uploads_bytes BIGINT,
    message       TEXT
  );

  -- Simple key/value store for admin-editable business settings
  -- (e.g. whatsapp_number). Read with a fallback default where used.
  CREATE TABLE IF NOT EXISTS settings (
    key        VARCHAR(100) PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function initSettingsDB() {
  try {
    await pool.query(SETTINGS_SCHEMA);
    console.log("✓ Settings schema ready");
  } catch (err) {
    console.error("✗ Settings schema init failed:", err.message);
  }
}

// Export alongside existing
module.exports.initSettingsDB = initSettingsDB;