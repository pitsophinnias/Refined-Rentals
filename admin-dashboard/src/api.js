/**
 * api.js — Admin dashboard API utility
 * Token stored in sessionStorage (safer than localStorage — cleared when tab closes).
 * Sent via Authorization: Bearer header on every protected request.
 * On production with a real domain, this switches to httpOnly cookies.
 */

const BASE = "http://localhost:3001/api";

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
async function apiFetch(path, opts = {}, authenticated = true) {
  const headers = { "Content-Type": "application/json" };

  if (authenticated) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...opts.headers },
    ...opts,
  });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    return;
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
  login:  (email, password) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, false),
  logout: () =>
    apiFetch("/auth/logout", { method: "POST" }),
  me:     () => apiFetch("/auth/me"),
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