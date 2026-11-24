/**
 * lib/serverChecks.js — read-only checks of the server the backend runs on,
 * for the System Admin's Security page. Runs as the backend's own (non-root)
 * user, so anything that needs root is reported as "couldn't check" with the
 * command to run by hand, never guessed.
 *
 * Results are cached for 10 minutes; pass fresh=true to re-run.
 */

const fs   = require("fs");
const path = require("path");
const tls  = require("tls");
const { execFile } = require("child_process");

const CACHE_MS = 10 * 60 * 1000;
let cache = null, cachedAt = 0;

function sh(cmd, args, timeout = 5000) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err?.code ?? 0, stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });
}

const check = (id, label, status, detail, fix) => ({ id, label, status, detail, fix: fix || null });
// status: "pass" | "warn" | "fail" | "unknown"

/* sshd uses the FIRST value it reads for a setting, with Include files read
   where the Include line appears (Ubuntu includes sshd_config.d/*.conf first). */
function readSshd() {
  const seen = {};
  let unreadable = false;
  const visit = (file) => {
    let text;
    try { text = fs.readFileSync(file, "utf8"); } catch { unreadable = true; return; }
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const [key, ...rest] = line.split(/\s+/);
      const k = key.toLowerCase();
      if (k === "match") break; // Match blocks apply conditionally; stop at the first
      if (k === "include") {
        for (const pattern of rest) {
          const dir = path.dirname(pattern.startsWith("/") ? pattern : path.join("/etc/ssh", pattern));
          const re = new RegExp("^" + path.basename(pattern).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
          let names = [];
          try { names = fs.readdirSync(dir).filter(n => re.test(n)).sort(); } catch { unreadable = true; }
          names.forEach(n => visit(path.join(dir, n)));
        }
        continue;
      }
      if (!(k in seen)) seen[k] = (rest[0] || "").toLowerCase();
    }
  };
  if (!fs.existsSync("/etc/ssh/sshd_config")) return null;
  visit("/etc/ssh/sshd_config");
  return { settings: seen, unreadable };
}

function certExpiry(host) {
  return new Promise(resolve => {
    const sock = tls.connect({ host: "127.0.0.1", port: 443, servername: host, rejectUnauthorized: false, timeout: 4000 }, () => {
      const cert = sock.getPeerCertificate();
      sock.end();
      resolve(cert?.valid_to ? { validTo: new Date(cert.valid_to), issuer: cert.issuer?.O || cert.issuer?.CN || "" } : null);
    });
    sock.on("error", () => resolve(null));
    sock.on("timeout", () => { sock.destroy(); resolve(null); });
  });
}

async function runChecks() {
  const results = [];
  const isLinux = process.platform === "linux";
  if (!isLinux) {
    return [check("platform", "Server checks", "unknown", "Server checks only run on the Linux server.")];
  }

  /* SSH */
  const sshd = readSshd();
  if (!sshd) {
    results.push(check("ssh", "SSH settings", "unknown", "No SSH server config found."));
  } else {
    const s = sshd.settings;
    const note = sshd.unreadable ? " (some SSH config files couldn't be read without root, so this may be incomplete)" : "";
    const root = s.permitrootlogin || "prohibit-password"; // OpenSSH default
    results.push(check("ssh_root", "SSH: root can't log in with a password",
      root === "yes" ? "fail" : "pass",
      `PermitRootLogin is "${root}"${note}.`,
      root === "yes" ? "Set PermitRootLogin no in /etc/ssh/sshd_config, then sudo systemctl reload ssh." : null));
    const pw = s.passwordauthentication || "yes"; // OpenSSH default
    results.push(check("ssh_password", "SSH: key-only logins",
      pw === "no" ? "pass" : "warn",
      pw === "no" ? `Password logins are off${note}.` : `Password logins are allowed${note}, so the server can be attacked by password guessing.`,
      pw === "no" ? null : "Once your key login works, set PasswordAuthentication no (check /etc/ssh/sshd_config.d/ too), then sudo systemctl reload ssh. Keep one SSH window open while testing."));
  }

  /* Firewall + fail2ban + auto updates (systemctl works without root) */
  const [ufw, f2b, unattended] = await Promise.all([
    sh("systemctl", ["is-active", "ufw"]),
    sh("systemctl", ["is-active", "fail2ban"]),
    sh("systemctl", ["is-enabled", "unattended-upgrades"]),
  ]);
  const ufwState = ufw.stdout.trim() || "not installed";
  results.push(check("firewall", "Firewall (ufw) is on",
    ufwState === "active" ? "pass" : "fail",
    ufwState === "active" ? "ufw is running. Its rules can only be read as root: run sudo ufw status verbose to review them." : `ufw is ${ufwState}.`,
    ufwState === "active" ? null : "Allow SSH first (sudo ufw allow OpenSSH), then sudo ufw allow 'Nginx Full' and sudo ufw enable."));
  const f2bState = f2b.stdout.trim() || "not installed";
  results.push(check("fail2ban", "fail2ban blocks SSH password guessing",
    f2bState === "active" ? "pass" : "warn",
    f2bState === "active" ? "fail2ban is running." : `fail2ban is ${f2bState}.`,
    f2bState === "active" ? null : "sudo apt install fail2ban (its default settings protect SSH)."));
  const autoState = unattended.stdout.trim() || "not installed";
  results.push(check("auto_updates", "Security updates install automatically",
    autoState === "enabled" ? "pass" : "warn",
    `unattended-upgrades is ${autoState}.`,
    autoState === "enabled" ? null : "sudo apt install unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades"));

  /* Pending updates + reboot */
  const aptCheck = await sh("/usr/lib/update-notifier/apt-check", [], 20000);
  const m = (aptCheck.stderr + aptCheck.stdout).match(/(\d+);(\d+)/);
  if (m) {
    const [all, security] = [Number(m[1]), Number(m[2])];
    results.push(check("updates", "No security updates waiting",
      security > 0 ? "warn" : "pass",
      `${security} security update${security === 1 ? "" : "s"} and ${all} update${all === 1 ? "" : "s"} in total are waiting.`,
      security > 0 ? "sudo apt update && sudo apt upgrade, at a quiet time." : null));
  } else {
    results.push(check("updates", "No security updates waiting", "unknown", "Couldn't read the update count on this server.", "Run sudo apt update && apt list --upgradable"));
  }
  const reboot = fs.existsSync("/var/run/reboot-required");
  results.push(check("reboot", "No restart needed", reboot ? "warn" : "pass",
    reboot ? "Updates installed earlier need a server restart to take effect." : "No restart pending.",
    reboot ? "At a quiet time: sudo reboot (PM2 brings the backend back if pm2 startup was set up; check with pm2 list afterwards)." : null));

  /* Listening ports */
  const ss = await sh("ss", ["-tlnH"]);
  if (ss.ok) {
    const listens = ss.stdout.split("\n").map(l => l.trim().split(/\s+/)[3]).filter(Boolean);
    const publicOn = (port) => listens.some(a => a.endsWith(`:${port}`) && !/^(127\.|\[::1\]|::1)/.test(a));
    const apiPort = String(process.env.PORT || 3001);
    results.push(check("api_local", "Backend only listens on the server itself",
      publicOn(apiPort) ? "warn" : "pass",
      publicOn(apiPort) ? `The backend listens on all addresses (port ${apiPort}), so it may be reachable at http://<server-ip>:${apiPort} without Nginx, HTTPS or Cloudflare (unless the firewall blocks it).` : "The backend is only reachable through Nginx.",
      publicOn(apiPort) ? "Add HOST=127.0.0.1 to backend/.env, then pm2 restart refined-rentals-backend --update-env." : null));
    results.push(check("db_local", "Database only listens on the server itself",
      publicOn(5432) ? "fail" : "pass",
      publicOn(5432) ? "PostgreSQL accepts connections from outside the server." : "PostgreSQL is only reachable from the server itself.",
      publicOn(5432) ? "Set listen_addresses = 'localhost' in postgresql.conf and restart PostgreSQL." : null));
  } else {
    results.push(check("ports", "Open ports", "unknown", "Couldn't list listening ports.", "Run ss -tln"));
  }

  /* SSL certificates (origin, as Nginx presents them to Cloudflare) */
  for (const host of ["refinedrentals.co.ls", "admin.refinedrentals.co.ls"]) {
    const c = await certExpiry(host);
    if (!c) {
      results.push(check(`ssl_${host}`, `SSL certificate: ${host}`, "unknown", "Couldn't read the certificate from Nginx on this server."));
      continue;
    }
    const days = Math.floor((c.validTo - Date.now()) / 86400000);
    results.push(check(`ssl_${host}`, `SSL certificate: ${host}`,
      days < 7 ? "fail" : days < 20 ? "warn" : "pass",
      `${c.issuer ? c.issuer + " certificate, " : ""}expires in ${days} days (${c.validTo.toISOString().slice(0, 10)}).`,
      days < 20 ? "Certbot renews automatically from 30 days out. Check it with sudo certbot renew --dry-run." : null));
  }

  return results;
}

async function serverChecks(fresh = false) {
  if (!fresh && cache && Date.now() - cachedAt < CACHE_MS) return { checkedAt: new Date(cachedAt), results: cache };
  cache = await runChecks();
  cachedAt = Date.now();
  return { checkedAt: new Date(cachedAt), results: cache };
}

module.exports = { serverChecks, readSshd };
