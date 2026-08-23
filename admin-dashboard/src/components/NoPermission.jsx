/**
 * components/NoPermission.jsx
 * Shown in place of a page's content when the current role can't access it —
 * a defense-in-depth backstop behind the sidebar's nav-item hiding.
 */

import { useTheme } from "../ThemeProvider.jsx";

export default function NoPermission() {
  const { C, F } = useTheme();
  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 700 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, padding: "3rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: C.danger, fontFamily: F.body, marginBottom: 10 }}>Access Restricted</div>
        <p style={{ color: C.textSecondary, fontFamily: F.body, fontSize: C.fontSize, margin: 0 }}>You don't have permission to access this section.</p>
      </div>
    </div>
  );
}
