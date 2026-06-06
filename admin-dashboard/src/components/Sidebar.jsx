/**
 * components/Sidebar.jsx
 * Fixed left sidebar — logo, navigation, logout.
 */

import { C, F } from "../tokens.js";

const NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" style={{ width: 17, height: 17 }}>
        <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: "requests",
    label: "Quote Requests",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" style={{ width: 17, height: 17 }}>
        <path d="M3 4h14M3 8h10M3 12h7M3 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" style={{ width: 17, height: 17 }}>
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function Sidebar({ page, setPage, requests }) {
  const newCount = requests.filter(r => r.status === "NEW").length;

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: C.surface,
      borderRight: `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
    }}>

      {/* Logo */}
      <div style={{
        padding: "1.75rem 1.5rem 1.5rem",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: `1.5px solid ${C.blue}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: F.display,
              fontSize: 13, fontWeight: 600,
              color: C.blue, letterSpacing: "0.04em", lineHeight: 1,
            }}>rr</span>
          </div>
          <div>
            <div style={{
              fontFamily: F.display,
              fontSize: 14, fontWeight: 600,
              color: C.textPrimary, letterSpacing: "0.04em", lineHeight: 1.2,
            }}>Refined Rentals</div>
            <div style={{
              fontSize: 8.5, letterSpacing: "0.2em", textTransform: "uppercase",
              color: C.textDim, fontFamily: F.body, marginTop: 2,
            }}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "1.25rem 0.75rem", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(item => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 11,
                padding: "10px 12px",
                borderRadius: 2,
                border: "none",
                background: active ? C.blueDim : "transparent",
                color: active ? C.blue : C.textSecondary,
                cursor: "pointer",
                fontFamily: F.body,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                letterSpacing: "0.02em",
                textAlign: "left",
                transition: "background 0.2s, color 0.2s",
                position: "relative",
                width: "100%",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = C.textPrimary; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textSecondary; }}}
            >
              {/* Active indicator */}
              {active && (
                <div style={{
                  position: "absolute", left: 0, top: "20%", bottom: "20%",
                  width: 2, borderRadius: 2,
                  background: C.blue,
                }} />
              )}
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>

              {/* New badge on requests nav item */}
              {item.id === "requests" && newCount > 0 && (
                <span style={{
                  background: C.blue, color: C.white,
                  fontSize: 9, fontWeight: 700,
                  padding: "2px 6px", borderRadius: 10,
                  fontFamily: F.body, letterSpacing: "0.05em",
                }}>{newCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "1rem 1.5rem",
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontSize: 11, color: C.textDim,
          fontFamily: F.body, marginBottom: 10,
        }}>
          Logged in as<br />
          <span style={{ color: C.textSecondary, fontWeight: 500 }}>Admin</span>
        </div>
        <button
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "none", border: "none",
            color: C.textDim, cursor: "pointer",
            fontSize: 11, letterSpacing: "0.12em",
            textTransform: "uppercase", fontFamily: F.body,
            padding: 0, transition: "color 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.danger}
          onMouseLeave={e => e.currentTarget.style.color = C.textDim}
        >
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 13, height: 13 }}>
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}