/**
 * tokens.js — pure JS, no JSX.
 * Updated: improved light mode palette, font size scaling
 */

export const F = {
  display: "'Cormorant Garamond', Georgia, serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

export function buildTokens(dark, fontSize = 14) {
  const blue      = "#2196c4";
  const blueLight = "#4db8e0";

  return {
    bg:           dark ? "#020c1e"                      : "#daeaf7",
    surface:      dark ? "#071428"                      : "#ffffff",
    surfaceUp:    dark ? "#0b1e3d"                      : "#ffffff",
    surfaceHover: dark ? "rgba(255,255,255,0.025)"      : "rgba(33,150,196,0.06)",

    border:       dark ? "rgba(255,255,255,0.07)"       : "rgba(33,150,196,0.18)",
    borderBlue:   dark ? "rgba(33,150,196,0.2)"         : "rgba(33,150,196,0.3)",

    blue,
    blueLight,
    blueDim:      dark ? "rgba(33,150,196,0.12)"        : "rgba(33,150,196,0.1)",

    textPrimary:   dark ? "#e8edf5"                     : "#061525",
    textSecondary: dark ? "rgba(232,237,245,0.52)"      : "rgba(6,21,37,0.65)",
    textDim:       dark ? "rgba(232,237,245,0.28)"      : "rgba(6,21,37,0.42)",

    statusNew:    { text: "#2196c4", bg: dark ? "rgba(33,150,196,0.12)"  : "rgba(33,150,196,0.1)",  dot: "#2196c4" },
    statusReview: { text: "#d4880a", bg: dark ? "rgba(232,160,32,0.12)"  : "rgba(212,136,10,0.1)",  dot: "#d4880a" },
    statusQuoted: { text: "#1e9160", bg: dark ? "rgba(39,168,110,0.12)"  : "rgba(30,145,96,0.1)",   dot: "#1e9160" },
    statusClosed: { text: "#7a8ba8", bg: dark ? "rgba(138,151,176,0.12)" : "rgba(122,139,168,0.1)", dot: "#7a8ba8" },

    white:  "#ffffff",
    danger: "#d94f4f",

    sidebarBg:     dark ? "#071428"                     : "#b8d9ef",
    sidebarBorder: dark ? "rgba(255,255,255,0.07)"      : "rgba(33,150,196,0.25)",
    activeNavBg:   dark ? "rgba(33,150,196,0.12)"       : "rgba(33,150,196,0.15)",

    fontSize,
    fontSizeSm:   fontSize - 1,
    fontSizeLg:   fontSize + 2,
  };
}

export function statusToken(status, C) {
  return {
    NEW:    C.statusNew,
    REVIEW: C.statusReview,
    QUOTED: C.statusQuoted,
    CLOSED: C.statusClosed,
  }[status] ?? C.statusClosed;
}

export function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function timeAgo(iso) {
  if (!iso) return "";
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}