/**
 * sysadmin/constants.js — plain data for the System Admin dashboard.
 * Modeled on Lashes By Retha's sysadmin pages, trimmed to what fits
 * Refined Rentals. System Controls and Backups come in a later PR.
 */

export const SYS_PAGES = [
  { id: "overview", label: "Overview" },
  { id: "users",    label: "Users" },
  { id: "roles",    label: "Roles" },
  { id: "audit",    label: "Audit Log" },
  { id: "health",   label: "System Health" },
  { id: "errors",   label: "Errors" },
  { id: "logins",   label: "Login Activity" },
  { id: "settings", label: "Settings" },
];

export const SYS_PAGE_LABELS = Object.fromEntries(SYS_PAGES.map(p => [p.id, p.label]));

export const ACTION_LABELS = {
  STATUS_NEW: "Set to New", STATUS_REVIEW: "Set to In Review", STATUS_QUOTED: "Quote Sent",
  STATUS_CLOSED: "Request Closed", QUOTE_SENT: "Quote Built & Sent",
  CREATE_USER: "Created User", DELETE_USER: "Removed User", CHANGE_ROLE: "Changed Role",
  RESET_PASSWORD: "Reset Password", CHANGE_OWN_PASSWORD: "Changed Own Password",
  MAKE_SYSADMIN: "Made System Admin", LOGOUT_EVERYWHERE: "Logged Out Everywhere",
  ERRORS_RESOLVED: "Resolved Errors",
  ADD_NOTIFICATION_EMAIL: "Added Notification Email", REMOVE_NOTIFICATION_EMAIL: "Removed Notification Email",
  REQUEST_DELETED: "Request Deleted", MANUAL_REQUEST_CREATED: "Manual Request Created",
  UPDATE_WHATSAPP_NUMBER: "Updated WhatsApp Number",
};

export const actionLabel = (a) => ACTION_LABELS[a] || String(a || "").replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());

// Plain-language permission names for the Roles page
export const PERMISSION_LABELS = {
  view: "View quote requests", review: "Move requests into review", quote: "Build and send quotes",
  close: "Close and delete requests", notes: "Internal notes", gallery: "Manage gallery",
  announcements: "Manage announcements", users: "Manage users", activity: "View activity log",
  notifications: "Notification emails", settings: "Business settings", system: "System pages",
};

export const ROLE_COLORS = {
  SYSADMIN: { bg: "rgba(217,79,79,0.12)",  color: "#d94f4f" },
  ADMIN:    { bg: "rgba(33,150,196,0.12)", color: "#2196c4" },
  MANAGER:  { bg: "rgba(30,145,96,0.1)",   color: "#1e9160" },
  FINANCE:  { bg: "rgba(130,90,200,0.1)",  color: "#8a5ac8" },
  STAFF:    { bg: "rgba(232,160,32,0.1)",  color: "#e8a020" },
  VIEWER:   { bg: "rgba(138,151,176,0.1)", color: "#7a8ba8" },
};

export const fmtDateTime = (iso) => iso
  ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "-";

export const fmtBytes = (n) => {
  if (n == null) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = Number(n);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
};

export const fmtDuration = (seconds) => {
  const s = Number(seconds) || 0;
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
};
