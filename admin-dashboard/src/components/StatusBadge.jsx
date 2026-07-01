/**
 * components/StatusBadge.jsx
 * Pill badge for request status. Used in tables, cards, detail views.
 */

import { useTheme } from "../ThemeProvider.jsx";
import { F, statusToken } from "../tokens.js";

const STATUS_LABELS = {
  NEW:    "New",
  REVIEW: "In Review",
  QUOTED: "Quoted",
  CLOSED: "Closed",
};

export default function StatusBadge({ status, size = "md" }) {
  const { C, F } = useTheme();

  const tok = statusToken(status, C);
  const isSmall = size === "sm";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: isSmall ? 5 : 6,
      background: tok.bg,
      color: tok.text,
      padding: isSmall ? "3px 8px" : "5px 12px",
      borderRadius: 2,
      fontSize: isSmall ? 10 : 11,
      fontWeight: 600,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      fontFamily: F.body,
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: isSmall ? 5 : 6,
        height: isSmall ? 5 : 6,
        borderRadius: "50%",
        background: tok.dot,
        flexShrink: 0,
      }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}