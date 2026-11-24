/**
 * scripts/backup.js — nightly backup of the database and uploaded files.
 *
 *   node scripts/backup.js            (run from the backend folder)
 *   node scripts/backup.js --trigger=manual
 *
 * What it does:
 *   1. pg_dump the database (custom format) and check the dump with pg_restore --list
 *   2. tar.gz the uploads folder (gallery and announcement pictures)
 *   3. delete backups older than BACKUP_KEEP_DAYS (default 14)
 *   4. record the run in backup_runs, which the System Admin's Backups page reads
 *
 * Files go to BACKUP_DIR (default ~/backups/refined-rentals), readable only by
 * this server user. Exits with code 1 if anything failed.
 *
 * Example crontab line (crontab -e, as the user that runs the backend):
 *   15 2 * * * cd /home/<user>/Refined-Rentals/backend && /usr/bin/node scripts/backup.js >> /home/<user>/backups/refined-rentals/backup.log 2>&1
 */

require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { pool } = require("../db.js");
const { BACKUP_DIR, KEEP_DAYS, FILE_RE } = require("../lib/backups.js");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const LOCK = path.join(BACKUP_DIR, ".backup.lock");
const trigger = (process.argv.find(a => a.startsWith("--trigger=")) || "--trigger=scheduled").split("=")[1].slice(0, 20);

// Same connection details db.js uses: DATABASE_URL in production, DB_* locally.
// Passed to pg_dump through environment variables, so the password never
// appears in the process list or the shell.
function pgEnv() {
  const env = { ...process.env };
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    env.PGHOST = u.hostname;
    env.PGPORT = u.port || "5432";
    env.PGUSER = decodeURIComponent(u.username);
    env.PGPASSWORD = decodeURIComponent(u.password);
    env.PGDATABASE = decodeURIComponent(u.pathname.replace(/^\//, ""));
  } else {
    env.PGHOST = process.env.DB_HOST || "localhost";
    env.PGPORT = process.env.DB_PORT || "5432";
    env.PGUSER = process.env.DB_USER;
    env.PGPASSWORD = process.env.DB_PASSWORD;
    env.PGDATABASE = process.env.DB_NAME;
  }
  return env;
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 15 * 60 * 1000, ...opts });
  if (r.error) throw new Error(`${cmd} could not start: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || "").trim().split("\n").slice(-2).join(" ").slice(0, 300)}`);
  return r;
}

function stamp(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function takeLock() {
  try {
    const st = fs.statSync(LOCK);
    if (Date.now() - st.mtimeMs < 60 * 60 * 1000) return false; // another run within the last hour
  } catch { /* no lock */ }
  fs.writeFileSync(LOCK, String(process.pid), { mode: 0o600 });
  return true;
}

async function record(row) {
  try {
    await pool.query(
      `INSERT INTO backup_runs (started_at, status, triggered_by, db_file, db_bytes, uploads_file, uploads_bytes, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [row.startedAt, row.status, trigger, row.dbFile || null, row.dbBytes || null, row.uploadsFile || null, row.uploadsBytes || null, row.message || null]
    );
  } catch (err) {
    console.error("Could not record backup run:", err.message);
  }
}

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  if (!takeLock()) {
    console.log("Another backup is already running. Skipping.");
    return;
  }

  const startedAt = new Date();
  // File names are per second; never reuse one that already exists, or a
  // failed run's cleanup could delete an earlier good backup.
  let nameTime = startedAt;
  while (fs.existsSync(path.join(BACKUP_DIR, `rr_db_${stamp(nameTime)}.dump`))) {
    nameTime = new Date(nameTime.getTime() + 1000);
  }
  const ts = stamp(nameTime);
  const row = { startedAt };
  const created = []; // files written by this run, removed again if it fails

  try {
    // 1. Database
    const dbFile = `rr_db_${ts}.dump`;
    const dbPath = path.join(BACKUP_DIR, dbFile);
    created.push(dbPath);
    const env = pgEnv();
    run("pg_dump", ["-Fc", "--no-owner", "--no-privileges", "-f", dbPath], { env });
    fs.chmodSync(dbPath, 0o600);
    run("pg_restore", ["--list", dbPath]); // proves the file is a readable dump
    row.dbFile = dbFile;
    row.dbBytes = fs.statSync(dbPath).size;

    // 2. Uploaded pictures
    if (fs.existsSync(UPLOADS_DIR)) {
      const upFile = `rr_uploads_${ts}.tar.gz`;
      const upPath = path.join(BACKUP_DIR, upFile);
      created.push(upPath);
      run("tar", ["-czf", upPath, "-C", path.dirname(UPLOADS_DIR), path.basename(UPLOADS_DIR)]);
      fs.chmodSync(upPath, 0o600);
      row.uploadsFile = upFile;
      row.uploadsBytes = fs.statSync(upPath).size;
    }

    // 3. Old backups
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
    let removed = 0;
    for (const name of fs.readdirSync(BACKUP_DIR).filter(n => FILE_RE.test(n))) {
      const p = path.join(BACKUP_DIR, name);
      if (fs.statSync(p).mtimeMs < cutoff) { fs.unlinkSync(p); removed++; }
    }

    row.status = "success";
    row.message = `Kept ${KEEP_DAYS} days${removed ? `, removed ${removed} old file${removed === 1 ? "" : "s"}` : ""}.`;
    console.log(`[${new Date().toISOString()}] Backup OK: ${row.dbFile} (${row.dbBytes} bytes)${row.uploadsFile ? `, ${row.uploadsFile} (${row.uploadsBytes} bytes)` : ""}`);
  } catch (err) {
    row.status = "failed";
    row.message = err.message;
    // Never leave a half-written file that looks like a good backup
    for (const f of created) { try { fs.unlinkSync(f); } catch { /* not written */ } }
    row.dbFile = row.uploadsFile = null;
    console.error(`[${new Date().toISOString()}] Backup FAILED:`, err.message);
    process.exitCode = 1;
  } finally {
    await record(row);
    try { fs.unlinkSync(LOCK); } catch { /* already gone */ }
  }
}

main().finally(() => pool.end());
