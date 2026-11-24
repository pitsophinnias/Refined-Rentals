/**
 * sysadmin/ui.jsx — small shared building blocks for the System Admin pages,
 * styled with the same theme tokens as the rest of the admin dashboard.
 */

import { useTheme } from "../ThemeProvider.jsx";
import { ROLE_LABELS } from "../usePermissions.js";
import { ROLE_COLORS, actionLabel } from "./constants.js";

export function PageHeader({ eyebrow = "System Admin", title, subtitle, action }) {
  const { C, F } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: "1.75rem" }}>
      <div>
        <div style={{ fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: C.danger, fontFamily: F.body, marginBottom: 6 }}>{eyebrow}</div>
        <h1 className="rr-page-title" style={{ fontFamily: F.display, fontSize: "2rem", fontWeight: 500, color: C.textPrimary, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: C.textSecondary, fontFamily: F.body, fontSize: C.fontSize, fontWeight: 300, margin: "6px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, right, children, padded = true }) {
  const { C, F } = useTheme();
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, marginBottom: "1.25rem", overflow: "hidden" }}>
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "0.9rem 1.25rem", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: C.textSecondary, fontFamily: F.body, fontWeight: 600 }}>{title}</div>
          {right}
        </div>
      )}
      <div style={{ padding: padded ? "1rem 1.25rem" : 0 }}>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, hint, accent }) {
  const { C, F } = useTheme();
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `2px solid ${accent || C.blue}`, borderRadius: 3, padding: "1.1rem 1.25rem" }}>
      <div style={{ fontFamily: F.display, fontSize: "2rem", fontWeight: 500, color: C.textPrimary, lineHeight: 1.1 }}>{value ?? "–"}</div>
      <div style={{ fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textSecondary, fontFamily: F.body, marginTop: 6 }}>{label}</div>
      {hint && <div style={{ fontSize: C.fontSizeSm - 1, color: C.textDim, fontFamily: F.body, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", disabled = false, small = false, type = "button" }) {
  const { C, F } = useTheme();
  const styles = {
    primary: { background: C.blue, color: "#fff", border: "none" },
    ghost:   { background: "none", color: C.textSecondary, border: `1px solid ${C.border}` },
    danger:  { background: "rgba(217,79,79,0.08)", color: C.danger, border: "1px solid rgba(217,79,79,0.25)" },
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...styles, borderRadius: 2, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, padding: small ? "6px 12px" : "9px 18px", fontFamily: F.body, fontSize: small ? C.fontSizeSm : C.fontSize, fontWeight: 600, letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  const { C, F } = useTheme();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, fontFamily: F.body }}>{label}</span>
      {children}
    </label>
  );
}

export function Feedback({ msg, type = "success" }) {
  const { C, F } = useTheme();
  if (!msg) return null;
  const ok = type === "success";
  return (
    <div role="status" style={{ background: ok ? "rgba(30,145,96,0.1)" : "rgba(217,79,79,0.1)", border: `1px solid ${ok ? "rgba(30,145,96,0.3)" : "rgba(217,79,79,0.3)"}`, color: ok ? "#1e9160" : C.danger, borderRadius: 2, padding: "9px 13px", fontFamily: F.body, fontSize: C.fontSizeSm, marginBottom: "1rem" }}>
      {msg}
    </div>
  );
}

export function RoleBadge({ role }) {
  const { F } = useTheme();
  const col = ROLE_COLORS[role] || ROLE_COLORS.VIEWER;
  return (
    <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: F.body, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: col.bg, color: col.color, whiteSpace: "nowrap" }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export function ActionBadge({ action }) {
  const { C, F } = useTheme();
  const a = String(action || "");
  const isUser = /USER|ROLE|PASSWORD|SYSADMIN/.test(a);
  const isQuote = a.startsWith("STATUS_") || a === "QUOTE_SENT";
  const color = isUser ? "#e8a020" : isQuote ? C.blue : C.textSecondary;
  const bg = isUser ? "rgba(232,160,32,0.1)" : isQuote ? C.blueDim : C.border;
  return (
    <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: F.body, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: bg, color, display: "inline-block", lineHeight: 1.5 }}>
      {actionLabel(a)}
    </span>
  );
}

/* Simple responsive table: scrolls sideways on small screens */
export function Table({ head, children, empty }) {
  const { C, F } = useTheme();
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: C.fontSizeSm }}>
        <thead>
          <tr>
            {head.map(h => (
              <th key={h} style={{ textAlign: "left", padding: "9px 14px", fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, fontWeight: 600, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Td({ children, muted = false, nowrap = false, style }) {
  const { C } = useTheme();
  return (
    <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, color: muted ? C.textDim : C.textPrimary, verticalAlign: "top", whiteSpace: nowrap ? "nowrap" : "normal", overflowWrap: "anywhere", ...style }}>
      {children}
    </td>
  );
}

export function Empty({ children }) {
  const { C, F } = useTheme();
  return <div style={{ padding: "1.25rem 1.25rem", color: C.textDim, fontFamily: F.body, fontSize: C.fontSizeSm }}>{children}</div>;
}
