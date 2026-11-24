/**
 * api.js — Customer site API utility
 * All calls go to the local backend at http://localhost:3001
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
// Origin (no /api suffix) — used to build absolute URLs for uploaded assets
// (e.g. gallery images), which are served from /uploads, not /api.
export const API_ORIGIN = BASE.replace(/\/api\/?$/, "");

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  /* Quote requests */
  submitRequest: (data) =>
    apiFetch("/requests", { method: "POST", body: JSON.stringify(data) }),

  /* Gallery — public. category: "main" (homepage slideshow) or "contact" (contact grid) */
  getGallery: (category) =>
    apiFetch(`/gallery${category ? `?category=${category}` : ""}`),

  /* Site status — maintenance mode, set by the System Admin */
  getStatus: () => apiFetch("/status"),

  /* Announcements — public active only */
  getActiveAnnouncements: () => apiFetch("/announcements/active"),
};
