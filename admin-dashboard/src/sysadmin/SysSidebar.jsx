/**
 * sysadmin/SysSidebar.jsx — sidebar for the System Admin dashboard.
 * Same layout and mobile drawer behaviour as components/Sidebar.jsx.
 */

import { useTheme } from "../ThemeProvider.jsx";
import { SYS_PAGES } from "./constants.js";
import { RoleBadge } from "./ui.jsx";

const s = { width: 17, height: 17 };
const ICONS = {
  overview: <svg viewBox="0 0 20 20" fill="none" style={s}><rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  users:    <svg viewBox="0 0 20 20" fill="none" style={s}><circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 17c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M13.5 4.5a2.5 2.5 0 010 5M15 12.8c1.3.6 2.2 1.9 2.5 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  roles:    <svg viewBox="0 0 20 20" fill="none" style={s}><path d="M10 2l6 2.5v4.7c0 3.9-2.6 7-6 8.8-3.4-1.8-6-4.9-6-8.8V4.5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7.5 10l1.8 1.8L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  audit:    <svg viewBox="0 0 20 20" fill="none" style={s}><rect x="4" y="2.5" width="12" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  controls: <svg viewBox="0 0 20 20" fill="none" style={s}><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="5" r="1.8" fill="currentColor"/><circle cx="13" cy="10" r="1.8" fill="currentColor"/><circle cx="9" cy="15" r="1.8" fill="currentColor"/></svg>,
  backups:  <svg viewBox="0 0 20 20" fill="none" style={s}><ellipse cx="10" cy="5" rx="6" ry="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  security: <svg viewBox="0 0 20 20" fill="none" style={s}><path d="M10 2l6 2.5v4.7c0 3.9-2.6 7-6 8.8-3.4-1.8-6-4.9-6-8.8V4.5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="10" cy="9" r="1.6" stroke="currentColor" strokeWidth="1.4"/><path d="M10 10.6V13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  health:   <svg viewBox="0 0 20 20" fill="none" style={s}><path d="M2 10h3.5l2-5 3 10 2-5H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  errors:   <svg viewBox="0 0 20 20" fill="none" style={s}><path d="M10 2.5L18 17H2L10 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 8v4M10 14.5v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  logins:   <svg viewBox="0 0 20 20" fill="none" style={s}><rect x="4" y="9" width="12" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  settings: <svg viewBox="0 0 20 20" fill="none" style={s}><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};

export default function SysSidebar({ page, setPage, onSignOut, adminEmail, mobileOpen = false, onCloseMobile }) {
  const { C, F } = useTheme();

  return (
    <aside className={`rr-sidebar${mobileOpen ? " rr-sidebar-open" : ""}`} style={{ width: 220, flexShrink: 0, background: C.sidebarBg, borderRight: `1px solid ${C.sidebarBorder}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", transition: "background 0.3s" }}>
      <div style={{ padding: "1.75rem 1.5rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${C.danger}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 600, color: C.danger }}>rr</span>
          </div>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.textPrimary, letterSpacing: "0.04em" }}>Refined Rentals</div>
            <div style={{ fontSize: 8.5, letterSpacing: "0.2em", textTransform: "uppercase", color: C.danger, fontFamily: F.body, marginTop: 2 }}>System Admin</div>
          </div>
        </div>
        <button className="rr-sidebar-close" onClick={onCloseMobile} aria-label="Close menu" style={{ display: "none", background: "none", border: `1px solid ${C.border}`, borderRadius: "50%", width: 28, height: 28, cursor: "pointer", flexShrink: 0, alignItems: "center", justifyContent: "center", color: C.textSecondary }}>✕</button>
      </div>

      <nav style={{ flex: 1, padding: "1.25rem 0.75rem", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {SYS_PAGES.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} aria-current={active ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 2, border: "none", background: active ? C.activeNavBg : "transparent", color: active ? C.blue : C.textSecondary, cursor: "pointer", fontFamily: F.body, fontSize: C.fontSize, fontWeight: active ? 600 : 400, textAlign: "left", position: "relative", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.color = C.textPrimary; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textSecondary; } }}
            >
              {active && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 2, borderRadius: 2, background: C.blue }} />}
              {ICONS[item.id]}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        <div style={{ fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body, lineHeight: 1.5, minWidth: 0 }}>
          <div title={adminEmail} style={{ color: C.textSecondary, fontWeight: 500, marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminEmail}</div>
          <RoleBadge role="SYSADMIN" />
        </div>
        <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.2)", borderRadius: 2, color: C.danger, cursor: "pointer", padding: "9px 14px", fontFamily: F.body, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 13, height: 13 }}><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
