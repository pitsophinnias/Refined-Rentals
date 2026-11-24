/**
 * lib/originWatch.js — notices API requests that reached the server without
 * going through Cloudflare (someone using the server's IP address directly).
 * Kept in memory since the last restart; shown on the Security page.
 *
 * Requests from Nginx carry X-Forwarded-For. Those that came through
 * Cloudflare also carry CF-Connecting-IP. Local calls (health checks, scripts)
 * have neither and are ignored.
 */

const state = { since: new Date(), count: 0, lastAt: null, recent: [] };

function originWatch(req, res, next) {
  if (req.headers["x-forwarded-for"] && !req.headers["cf-connecting-ip"]) {
    state.count++;
    state.lastAt = new Date();
    state.recent.unshift({ at: state.lastAt, ip: String(req.ip || "").slice(0, 64), path: String(req.path || "").slice(0, 80) });
    state.recent.length = Math.min(state.recent.length, 10);
  }
  next();
}

const directTraffic = () => ({ ...state, recent: [...state.recent] });

module.exports = { originWatch, directTraffic };
