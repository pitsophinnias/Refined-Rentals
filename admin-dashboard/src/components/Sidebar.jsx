/**
 * components/Sidebar.jsx
 * Updated: Gallery and Announcements nav items added
 */

import { useTheme } from "../ThemeProvider.jsx";
import { usePermissions, ROLE_LABELS } from "../usePermissions.js";

const NAV = [
  { id: "dashboard",     label: "Dashboard",       icon: <svg viewBox="0 0 20 20" fill="none" style={{width:17,height:17}}><rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id: "requests",      label: "Quote Requests",  icon: <svg viewBox="0 0 20 20" fill="none" style={{width:17,height:17}}><path d="M3 4h14M3 8h10M3 12h7M3 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id: "gallery",       label: "Gallery",          icon: <svg viewBox="0 0 20 20" fill="none" style={{width:17,height:17}}><rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 13l4-4 3 3 3-4 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
  { id: "announcements", label: "Announcements",    icon: <svg viewBox="0 0 20 20" fill="none" style={{width:17,height:17}}><path d="M3 7h10l2-3v12l-2-3H3a1 1 0 01-1-1V8a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M16 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id: "settings",      label: "Settings",         icon: <svg viewBox="0 0 20 20" fill="none" style={{width:17,height:17}}><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
];

export default function Sidebar({ page, setPage, requests, onSignOut, adminEmail }) {
  const { C, F } = useTheme();
  const { can, role, roleLabel } = usePermissions();
  const newCount = requests.filter(r => r.status === "NEW").length;

  // Check for expiring announcements (within 24h)
  let expiringCount = 0;
  try {
    const ann = JSON.parse(localStorage.getItem("rr_announcements") || "[]");
    const in24h = Date.now() + 24 * 60 * 60 * 1000;
    expiringCount = ann.filter(a => a.active && new Date(a.endDate).getTime() < in24h && new Date(a.endDate).getTime() > Date.now()).length;
  } catch(e) {}

  return (
    <aside style={{ width: 220, flexShrink: 0, background: C.sidebarBg, borderRight: `1px solid ${C.sidebarBorder}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, transition: "background 0.3s, border-color 0.3s" }}>

      {/* Logo */}
      <div style={{ padding: "1.75rem 1.5rem 1.5rem", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${C.blue}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 600, color: C.blue }}>rr</span>
          </div>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.textPrimary, letterSpacing: "0.04em" }}>Refined Rentals</div>
            <div style={{ fontSize: 8.5, letterSpacing: "0.2em", textTransform: "uppercase", color: C.textDim, fontFamily: F.body, marginTop: 2 }}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "1.25rem 0.75rem", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.filter(item => {
          if (item.id === "gallery"       && !can("gallery"))       return false;
          if (item.id === "announcements" && !can("announcements")) return false;
          if (item.id === "settings"      && !can("notes"))         return false; // only staff+ see settings
          return true;
        }).map(item => {
          const active = page === item.id;
          const badge  = item.id === "requests" ? newCount
                       : item.id === "announcements" ? expiringCount : 0;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 2, border: "none", background: active ? C.activeNavBg : "transparent", color: active ? C.blue : C.textSecondary, cursor: "pointer", fontFamily: F.body, fontSize: C.fontSize, fontWeight: active ? 600 : 400, textAlign: "left", width: "100%", position: "relative", transition: "background 0.2s, color 0.2s" }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.color = C.textPrimary; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textSecondary; }}}
            >
              {active && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 2, borderRadius: 2, background: C.blue }} />}
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge > 0 && (
                <span style={{ background: item.id === "announcements" ? "#e8a020" : C.blue, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body, lineHeight: 1.5 }}>
          <div style={{ color: C.textSecondary, fontWeight: 500, marginBottom: 3 }}>{adminEmail || "Admin"}</div>
          <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: role === "ADMIN" ? C.blueDim : "rgba(232,160,32,0.1)", color: role === "ADMIN" ? C.blue : "#e8a020" }}>
            {roleLabel}
          </span>
        </div>
        <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.2)", borderRadius: 2, color: C.danger, cursor: "pointer", fontSize: C.fontSizeSm, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: F.body, fontWeight: 600, padding: "9px 12px", width: "100%", transition: "background 0.2s, border-color 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(217,79,79,0.15)"; e.currentTarget.style.borderColor = "rgba(217,79,79,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(217,79,79,0.08)"; e.currentTarget.style.borderColor = "rgba(217,79,79,0.2)"; }}
        >
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 13, height: 13 }}><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}