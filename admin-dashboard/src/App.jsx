/**
 * App.jsx — Refined Rentals Admin Dashboard
 * Updated: Gallery, Announcements pages; font size control; TopBar with SVG icons
 */

import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "./ThemeProvider.jsx";
import { F } from "./tokens.js";
import { MOCK_REQUESTS } from "./data/mockRequests.js";

import Login          from "./pages/Login.jsx";
import Dashboard      from "./pages/Dashboard.jsx";
import Requests       from "./pages/Requests.jsx";
import RequestDetail  from "./pages/RequestDetail.jsx";
import Settings       from "./pages/Settings.jsx";
import GalleryAdmin   from "./pages/GalleryAdmin.jsx";
import Announcements  from "./pages/Announcements.jsx";
import Sidebar        from "./components/Sidebar.jsx";

/* ── TopBar ── */
function TopBar({ page }) {
  const { C, F, isDark, toggle } = useTheme();
  const PAGE_LABELS = { dashboard: "Dashboard", requests: "Quote Requests", settings: "Settings", gallery: "Gallery", announcements: "Announcements" };

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 2.5rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.3s, border-color 0.3s" }}>
      <span style={{ fontFamily: F.body, fontSize: C.fontSizeSm, fontWeight: 600, color: C.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {PAGE_LABELS[page] ?? ""}
      </span>

      {/* Theme toggle with proper SVG icons */}
      <button onClick={toggle} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{ display: "flex", alignItems: "center", gap: 9, background: isDark ? "rgba(33,150,196,0.1)" : "rgba(33,150,196,0.12)", border: `1px solid ${isDark ? "rgba(33,150,196,0.25)" : "rgba(33,150,196,0.3)"}`, borderRadius: 20, padding: "6px 14px 6px 10px", cursor: "pointer", transition: "all 0.25s" }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(33,150,196,0.18)" : "rgba(33,150,196,0.2)"}
        onMouseLeave={e => e.currentTarget.style.background = isDark ? "rgba(33,150,196,0.1)" : "rgba(33,150,196,0.12)"}
      >
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: isDark ? "#1a4a7a" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s", flexShrink: 0 }}>
          {isDark ? (
            /* Crescent moon SVG */
            <svg viewBox="0 0 20 20" fill="white" style={{ width: 14, height: 14 }}>
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
            </svg>
          ) : (
            /* Sun SVG */
            <svg viewBox="0 0 20 20" fill="white" style={{ width: 14, height: 14 }}>
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
            </svg>
          )}
        </div>
        <span style={{ fontSize: C.fontSizeSm, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: F.body, color: isDark ? C.blue : "#92400e" }}>
          {isDark ? "Dark" : "Light"}
        </span>
      </button>
    </div>
  );
}

function GlobalStyles({ C }) {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: ${C.bg}; color: ${C.textPrimary}; font-family: 'DM Sans', system-ui, sans-serif; font-size: ${C.fontSize}px; transition: background 0.3s, color 0.3s; }
      #root { width: 100%; max-width: 100%; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(33,150,196,0.25); border-radius: 3px; }
      input[type="date"] { color-scheme: ${C.bg.includes("dae") ? "light" : "dark"}; }
      select { color-scheme: ${C.bg.includes("dae") ? "light" : "dark"}; }
      main > div { animation: pageIn 0.22s cubic-bezier(.25,.46,.45,.94); }
      @keyframes pageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
  );
}

function Shell() {
  const { C, isDark } = useTheme();
  const [authed,     setAuthed]     = useState(() => { try { return localStorage.getItem("rr-admin-authed") === "true"; } catch { return false; } });
  const [page,       setPage]       = useState("dashboard");
  const [requests,   setRequests]   = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("rr_quote_requests") || "null");
      return stored?.length ? stored : MOCK_REQUESTS;
    } catch { return MOCK_REQUESTS; }
  });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  // Sync requests from localStorage periodically
  useEffect(() => {
    const sync = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("rr_quote_requests") || "null");
        if (stored?.length) setRequests(stored);
      } catch {}
    };
    const iv = setInterval(sync, 3000);
    return () => clearInterval(iv);
  }, []);

  const updateRequest = (updated) => {
    const next = requests.map(r => r.id === updated.id ? updated : r);
    setRequests(next);
    try { localStorage.setItem("rr_quote_requests", JSON.stringify(next)); } catch {}
  };

  const handleSignOut = () => {
    try { localStorage.removeItem("rr-admin-authed"); } catch {}
    setAuthed(false);
  };

  const handleSelectId = (id) => { setSelectedId(id); setPage("requests"); };
  const handleBack = () => setSelectedId(null);

  if (!authed) return (
    <>
      <GlobalStyles C={C} />
      <Login onLogin={() => { try { localStorage.setItem("rr-admin-authed","true"); } catch {} setAuthed(true); }} />
    </>
  );

  const selectedRequest = selectedId ? requests.find(r => r.id === selectedId) : null;

  return (
    <>
      <GlobalStyles C={C} />
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, transition: "background 0.3s" }}>
        <Sidebar page={page} setPage={p => { setPage(p); setSelectedId(null); }} requests={requests} onSignOut={handleSignOut} />
        <main style={{ flex: 1, overflowY: "auto", minHeight: "100vh" }}>
          <TopBar page={page} />
          {page === "dashboard"     && <Dashboard requests={requests} setPage={setPage} setSelectedId={handleSelectId} />}
          {page === "requests"      && !selectedRequest && <Requests requests={requests} setSelectedId={setSelectedId} />}
          {page === "requests"      && selectedRequest  && <RequestDetail request={selectedRequest} onBack={handleBack} onUpdate={updateRequest} />}
          {page === "gallery"       && <GalleryAdmin />}
          {page === "announcements" && <Announcements />}
          {page === "settings"      && <Settings />}
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}