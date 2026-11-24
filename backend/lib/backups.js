/**
 * lib/backups.js — where backups live and how to list them.
 * Shared by scripts/backup.js (writes) and routes/system.js (reads).
 */

const fs   = require("fs");
const os   = require("os");
const path = require("path");

// Outside the repo on purpose: a git reset or clone never touches backups,
// and they never end up in the public repository.
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(os.homedir(), "backups", "refined-rentals");
const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS) || 14;
const FILE_RE = /^rr_(db|uploads)_\d{8}-\d{6}\.(dump|tar\.gz)$/;

async function listBackupFiles() {
  let names = [];
  try { names = await fs.promises.readdir(BACKUP_DIR); } catch { return []; }
  const files = [];
  for (const name of names.filter(n => FILE_RE.test(n))) {
    try {
      const st = await fs.promises.stat(path.join(BACKUP_DIR, name));
      files.push({ name, kind: name.startsWith("rr_db_") ? "database" : "uploads", bytes: st.size, modifiedAt: st.mtime });
    } catch { /* removed meanwhile */ }
  }
  return files.sort((a, b) => b.modifiedAt - a.modifiedAt);
}

module.exports = { BACKUP_DIR, KEEP_DAYS, FILE_RE, listBackupFiles };
