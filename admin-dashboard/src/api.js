/**
 * api.js — Admin dashboard API utility
 * Token stored in sessionStorage (safer than localStorage — cleared when tab closes).
 * Sent via Authorization: Bearer header on every protected request.
 * On production with a real domain, this switches to httpOnly cookies.
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

/* ── Token storage — sessionStorage ─────────────────────────── */
export function getToken() {
  try { return sessionStorage.getItem("rr-admin-token"); } catch { return null; }
}
export function setToken(t) {
  try { sessionStorage.setItem("rr-admin-token", t); } catch {}
}
export function clearToken() {
  try { sessionStorage.removeItem("rr-admin-token"); } catch {}
}

/* ── Core fetch ──────────────────────────────────────────────── */
// timeoutMs is optional — omit it to keep the original "wait forever" fetch
// behavior for existing callers. Pass it for requests that need to survive
// a slow Render cold start without hanging indefinitely (e.g. login).
async function apiFetch(path, opts = {}, authenticated = true, silentAuth = false, timeoutMs = null) {
  const headers = { "Content-Type": "application/json" };

  if (authenticated) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { ...headers, ...opts.headers },
      ...(controller ? { signal: controller.signal } : {}),
      ...opts,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("TIMEOUT");
    throw new Error("NETWORK_ERROR");
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (res.status === 401) {
    // Only force a reload when we were relying on a stored token and it
    // turned out to be stale/invalid. A fresh login attempt (authenticated
    // = false) with wrong credentials should just throw so the caller can
    // show an error — not blow away the page before it gets the chance to.
    if (authenticated && !silentAuth) {
      clearToken();
      window.location.reload();
      return;
    }
    const err = await res.json().catch(() => ({ error: "Unauthorized" }));
    throw new Error(err.error || "Unauthorized");
  }

  if (res.status === 429) {
    const err = await res.json().catch(() => ({ error: "Too many requests" }));
    throw new Error(err.error || "Too many requests");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

/* Multipart fetch for file uploads */
async function apiFetchMultipart(path, formData) {
  const token = getToken();
  const res   = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    formData,
  });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }

  return res.json();
}

/* ── Auth ────────────────────────────────────────────────────── */
export const auth = {
  // 60s timeout — the backend is on Render's free tier and can take
  // 30-60s to wake from a cold start on the first request.
  login:  (email, password) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, false, false, 60000),
  logout: () =>
    apiFetch("/auth/logout", { method: "POST" }),
  me:     () => apiFetch("/auth/me", {}, true, true), // silent — 401 throws, no reload
};

/* ── Health ──────────────────────────────────────────────────── */
// Fire-and-forget ping used to wake a sleeping Render backend as early as
// possible (e.g. on the login page mounting), before the user submits.
export const health = {
  ping: () => apiFetch("/health", {}, false, false, 60000),
};

/* ── Quote requests ──────────────────────────────────────────── */
export const requests = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/requests${q ? `?${q}` : ""}`);
  },
  get:    (id)       => apiFetch(`/requests/${id}`),
  update: (id, data) =>
    apiFetch(`/requests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id)       =>
    apiFetch(`/requests/${id}`, { method: "DELETE" }),
  // Admin manually entering a request on behalf of a WhatsApp/phone client.
  createManual: (data) =>
    apiFetch("/requests/manual", { method: "POST", body: JSON.stringify(data) }),
};

/* ── Gallery ─────────────────────────────────────────────────── */
export const gallery = {
  list:        ()          => apiFetch("/gallery"),
  upload:      (formData)  => apiFetchMultipart("/gallery", formData),
  updateLabel: (id, label) =>
    apiFetch(`/gallery/${id}`, { method: "PATCH", body: JSON.stringify({ label }) }),
  reorder:     (items)     =>
    apiFetch("/gallery/reorder", { method: "PATCH", body: JSON.stringify({ items }) }),
  delete:      (id)        =>
    apiFetch(`/gallery/${id}`, { method: "DELETE" }),
};

/* ── Announcements ───────────────────────────────────────────── */
export const announcements = {
  list:   ()         => apiFetch("/announcements"),
  create: (data)     =>
    apiFetch("/announcements", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    apiFetch(`/announcements/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id)       =>
    apiFetch(`/announcements/${id}`, { method: "DELETE" }),
};
