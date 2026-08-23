/**
 * App.jsx — Refined Rentals Admin Dashboard
 * Updated: Gallery, Announcements pages; font size control; TopBar with SVG icons
 */

import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "./ThemeProvider.jsx";
import { F } from "./tokens.js";
import { auth as authApi, requests as requestsApi, getToken, setToken, clearToken } from "./api.js";

import Login          from "./pages/Login.jsx";
import Dashboard      from "./pages/Dashboard.jsx";
import Requests       from "./pages/Requests.jsx";
import RequestDetail  from "./pages/RequestDetail.jsx";
import Settings       from "./pages/Settings.jsx";
import GalleryAdmin   from "./pages/GalleryAdmin.jsx";
import Announcements  from "./pages/Announcements.jsx";
import Sidebar        from "./components/Sidebar.jsx";

/* ── TopBar ── */
function TopBar({ page, onMenuClick }) {
  const { C, F, isDark, toggle } = useTheme();
  const PAGE_LABELS = { dashboard: "Dashboard", requests: "Quote Requests", settings: "Settings", gallery: "Gallery", announcements: "Announcements" };

  return (
    <div className="rr-topbar" style={{ position: "sticky", top: 0, zIndex: 50, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 2.5rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transition: "background 0.3s, border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {/* Hamburger — mobile only */}
        <button
          className="rr-hamburger"
          onClick={onMenuClick}
          aria-label="Open menu"
          style={{ display: "none", background: "none", border: `1px solid ${C.border}`, borderRadius: 2, width: 36, height: 36, cursor: "pointer", flexShrink: 0, alignItems: "center", justifyContent: "center" }}
        >
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 16, height: 16 }}>
            <path d="M3 5h14M3 10h14M3 15h14" stroke={C.textSecondary} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <span style={{ fontFamily: F.body, fontSize: C.fontSizeSm, fontWeight: 600, color: C.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {PAGE_LABELS[page] ?? ""}
        </span>
      </div>

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

      /* ─── Mobile responsiveness (≤768px tablet, ≤600px phone) ──────── */
      @media(max-width:768px){
        html, body, #root { overflow-x: hidden; max-width: 100%; }

        /* Sidebar -> off-canvas drawer */
        .rr-sidebar {
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          height: 100vh !important;
          z-index: 400 !important;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
          box-shadow: 4px 0 28px rgba(0,0,0,0.4);
        }
        .rr-sidebar.rr-sidebar-open { transform: translateX(0); }
        .rr-sidebar-backdrop { position: fixed; inset: 0; background: rgba(2,8,22,0.6); z-index: 399; }
        .rr-hamburger { display: flex !important; }
        .rr-sidebar-close { display: flex !important; }
        .rr-topbar { padding: 0 1.25rem !important; }

        .rr-page { padding: 1.5rem 1.25rem !important; }
        .rr-page-title { font-size: 1.5rem !important; }

        .rr-stats-grid { grid-template-columns: 1fr !important; }
        .rr-dash-grid { grid-template-columns: minmax(0, 1fr) !important; }
        .rr-dash-grid > div { min-width: 0 !important; }

        /* Requests list: table -> stacked cards (two parallel renderings, CSS-toggled) */
        .rr-req-table-head, .rr-req-row-desktop { display: none !important; }
        .rr-req-row-mobile { display: flex !important; }

        .rr-detail-grid { grid-template-columns: 1fr !important; }
        .rr-inforow { flex-direction: column !important; gap: 3px !important; }
        .rr-quote-grid { grid-template-columns: 1fr 26px 52px 58px !important; gap: 4px !important; }

        .rr-gallery-items { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
        .rr-gallery-item { flex-direction: column !important; align-items: stretch !important; padding: 10px !important; }
        .rr-gallery-thumb { width: 100% !important; height: 120px !important; }

        .rr-settings-row { flex-direction: column !important; align-items: flex-start !important; }
        .rr-settings-row > div:last-child { width: 100% !important; }
        .rr-settings-row > div:last-child * { text-align: left !important; }

        .rr-ann-card { flex-direction: column !important; }
        .rr-ann-actions { flex-direction: row !important; width: 100% !important; margin-top: 10px; }

        .rr-cal-headrow, .rr-cal-grid { grid-template-columns: repeat(7, minmax(0, 1fr)) !important; }
        .rr-cal-cell { min-height: 46px !important; min-width: 0 !important; padding: 2px !important; overflow: hidden !important; }
        .rr-cal-cell > div { font-size: 9px !important; padding: 1px 2px !important; }
        .rr-cal-month-label { min-width: 84px !important; font-size: 0.85rem !important; }
      }

      @media(max-width:600px){
        .rr-page { padding: 1.25rem 1rem !important; }
        .rr-touch-btn { min-height: 44px !important; box-sizing: border-box; }
        .rr-note-sm { font-size: 14px !important; }
        .rr-activity-head { display: none !important; }
        .rr-activity-grid { grid-template-columns: 1fr !important; gap: 3px !important; }
        .rr-activity-grid > div:nth-child(3) { order: -1; margin-bottom: 3px; }
        .rr-nrm-grid { grid-template-columns: 1fr !important; }
        .rr-modal-card { padding: 1.25rem !important; }
        .rr-card-pad { padding-left: 1.1rem !important; padding-right: 1.1rem !important; }

        /* Stat cards: 2x2 grid on phone; last card spans full row if count is odd */
        .rr-stats-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
        .rr-stats-grid > div:nth-child(odd):last-child { grid-column: 1 / -1 !important; }
        .rr-stat-card { padding: 1rem !important; }
        .rr-stat-value { font-size: 1.7rem !important; }

        /* Event calendar: compact dot view instead of text bars */
        .rr-cal-card { overflow: visible !important; }
        .rr-cal-cell { min-height: 40px !important; overflow: visible !important; }
        .rr-cal-events-desktop { display: none !important; }
        .rr-cal-events-mobile { display: block !important; position: relative; }
        .rr-cal-navbtn { width: 44px !important; height: 44px !important; font-size: 18px !important; }

        .rr-cal-dots { display: flex; flex-wrap: wrap; gap: 3px; padding: 2px 0; cursor: pointer; min-height: 8px; }
        .rr-cal-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .rr-cal-popup-backdrop { position: fixed; inset: 0; z-index: 440; background: transparent; }
        .rr-cal-popup {
          position: absolute; top: 100%; z-index: 441; margin-top: 4px;
          min-width: 175px; max-width: 210px;
          background: ${C.surfaceUp}; border: 1px solid ${C.borderBlue}; border-radius: 4px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.45);
          padding: 6px; display: flex; flex-direction: column; gap: 2px;
        }
        .rr-cal-popup-item { display: flex; align-items: center; gap: 7px; padding: 7px 6px; border-radius: 3px; cursor: pointer; }
        .rr-cal-popup-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .rr-cal-popup-name { font-size: 12px; font-weight: 600; color: ${C.textPrimary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rr-cal-popup-event { font-size: 10.5px; color: ${C.textDim}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      }
    `}</style>
  );
}

function Shell() {
  const { C, isDark } = useTheme();
  const [authed,      setAuthed]     = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [page,       setPage]       = useState("dashboard");
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [adminEmail, setAdminEmail] = useState("");

  // Verify session cookie on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthed(false); setAuthChecked(true); return; }
    authApi.me()
      .then(data => { setAdminEmail(data.admin.email); setAuthed(true); setAuthChecked(true); })
      .catch(() => { clearToken(); setAuthed(false); setAuthChecked(true); });
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  // Load + poll requests from API
  useEffect(() => {
    if (!authed) return;
    const load = () =>
      requestsApi.list()
        .then(data => { setRequests(data.requests || []); setLoading(false); })
        .catch(() => setLoading(false));
    load();
    const iv = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(iv);
  }, [authed]);

  const updateRequest = async (updated) => {
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    try {
      const data = await requestsApi.update(updated.id, {
        status:         updated.status,
        notes:          updated.notes,
        quote_data:     updated.quote_data,
        reply_channels: updated.reply_channels,
        quoted_at:      updated.quoted_at,
        closed_reason:  updated.closed_reason,
        closed_note:    updated.closed_note,
      });
      // Sync with server response
      setRequests(prev => prev.map(r => r.id === data.request.id ? data.request : r));
    } catch (err) {
      console.error("Update request failed:", err);
    }
  };

  const handleRequestCreated = (request) => {
    setRequests(prev => [request, ...prev]);
    setSelectedId(request.id);
  };

  const handleSignOut = async () => {
    try { await authApi.logout(); } catch {}
    clearToken();
    setAuthed(false);
    setRequests([]);
  };

  const handleSelectId = (id) => { setSelectedId(id); setPage("requests"); };
  const handleBack = () => setSelectedId(null);

  const handleSetPage = (p) => { setPage(p); setSelectedId(null); setMobileNavOpen(false); };

  // Don't render anything until we know the session state
  if (!authChecked) return <GlobalStyles C={C} />;

  if (!authed) return (
    <>
      <GlobalStyles C={C} />
      <Login onLogin={(token, email) => { setToken(token); setAdminEmail(email); setAuthed(true); }} />
    </>
  );

  const selectedRequest = selectedId ? requests.find(r => r.id === selectedId) : null;

  return (
    <>
      <GlobalStyles C={C} />
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, transition: "background 0.3s" }}>
        {mobileNavOpen && <div className="rr-sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}
        <Sidebar page={page} setPage={handleSetPage} requests={requests} onSignOut={handleSignOut} adminEmail={adminEmail} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
        <main style={{ flex: 1, overflowY: "auto", minHeight: "100vh", minWidth: 0 }}>
          <TopBar page={page} onMenuClick={() => setMobileNavOpen(true)} />
          {page === "dashboard"     && <Dashboard requests={requests} setPage={setPage} setSelectedId={handleSelectId} />}
          {page === "requests"      && !selectedRequest && <Requests requests={requests} setSelectedId={setSelectedId} onRequestCreated={handleRequestCreated} />}
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
