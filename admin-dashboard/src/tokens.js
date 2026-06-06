/**
 * tokens.js
 * Shared design tokens for the Refined Rentals admin dashboard.
 * Matches the customer site palette — dark navy base, sky blue accent.
 */

export const C = {
  // Base surfaces
  bg:         "#020c1e",      // Page background — deepest navy
  surface:    "#071428",      // Card / panel surface
  surfaceUp:  "#0b1e3d",      // Elevated surface (modals, dropdowns)
  border:     "rgba(255,255,255,0.07)",
  borderBlue: "rgba(33,150,196,0.2)",

  // Brand
  blue:       "#2196c4",
  blueLight:  "#4db8e0",
  blueDim:    "rgba(33,150,196,0.12)",

  // Text
  textPrimary:   "#e8edf5",
  textSecondary: "rgba(232,237,245,0.5)",
  textDim:       "rgba(232,237,245,0.28)",

  // Status colours
  statusNew:     { text: "#2196c4", bg: "rgba(33,150,196,0.12)",  dot: "#2196c4" },
  statusReview:  { text: "#e8a020", bg: "rgba(232,160,32,0.12)",  dot: "#e8a020" },
  statusQuoted:  { text: "#27a86e", bg: "rgba(39,168,110,0.12)",  dot: "#27a86e" },
  statusClosed:  { text: "#8a97b0", bg: "rgba(138,151,176,0.12)", dot: "#8a97b0" },

  // Utility
  white:  "#ffffff",
  danger: "#d94f4f",
};

export const F = {
  display: "'Cormorant Garamond', Georgia, serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

// Map status string → token
export function statusToken(status) {
  return {
    NEW:    C.statusNew,
    REVIEW: C.statusReview,
    QUOTED: C.statusQuoted,
    CLOSED: C.statusClosed,
  }[status] ?? C.statusClosed;
}

// Format ISO date string → readable
export function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// Time ago
export function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}