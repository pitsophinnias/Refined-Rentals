/**
 * sysadmin/constants.js — plain data for the System Admin dashboard.
 * Modeled on Lashes By Retha's sysadmin pages, trimmed to what fits
 * Refined Rentals. More pages (System Health, Errors, Login Activity,
 * System Controls, Backups) are added in later PRs.
 */

export const SYS_PAGES = [
  { id: "overview", label: "Overview" },
  { id: "users",    label: "Users" },
  { id: "roles",    label: "Roles" },
  { id: "audit",    label: "Audit Log" },
  { id: "settings", label: "Settings" },
];

export const SYS_PAGE_LABELS = Object.fromEntries(SYS_PAGES.map(p => [p.id, p.label]));

export const ACTION_LABELS = {
  STATUS_NEW: "Set to New", STATUS_REVIEW: "Set to In Review", STATUS_QUOTED: "Quote Sent",
  STATUS_CLOSED: "Request Closed", QUOTE_SENT: "Quote Built & Sent",
  CREATE_USER: "Created User", DELETE_USER: "Removed User", CHANGE_ROLE: "Changed Role",
  RESET_PASSWORD: "Reset Password", CHANGE_OWN_PASSWORD: "Changed Own Password",
  MAKE_SYSADMIN: "Made System Admin",
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
