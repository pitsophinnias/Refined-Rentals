/**
 * App.jsx — Refined Rentals Admin Dashboard
 *
 * Architecture:
 *  - Simple state-based router (no react-router needed for this scale)
 *  - Auth gate: shows Login until credentials pass
 *  - Layout: Sidebar (fixed left) + main content area (scrollable)
 *  - Global state: requests array lifted here so all pages share it
 *
 * To add backend: replace MOCK_REQUESTS with a Supabase query in useEffect.
 */

import { useState, useEffect } from "react";
import { C, F } from "./tokens.js";
import { MOCK_REQUESTS } from "./data/mockRequests.js";

import Login         from "./pages/Login.jsx";
import Dashboard     from "./pages/Dashboard.jsx";
import Requests      from "./pages/Requests.jsx";
import RequestDetail from "./pages/RequestDetail.jsx";
import Settings      from "./pages/Settings.jsx";
import Sidebar       from "./components/Sidebar.jsx";

export default function App() {
  const [authed,      setAuthed]      = useState(false);
  const [page,        setPage]        = useState("dashboard");
  const [requests,    setRequests]    = useState(MOCK_REQUESTS);
  const [selectedId,  setSelectedId]  = useState(null);

  // Load Google Fonts
  useEffect(() => {
    const link  = document.createElement("link");
    link.rel    = "stylesheet";
    link.href   = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);

    // Global resets
    document.body.style.margin     = "0";
    document.body.style.padding    = "0";
    document.body.style.background = C.bg;
    document.body.style.color      = C.textPrimary;
    document.body.style.fontFamily = F.body;
  }, []);

  // Update a single request (status, notes, reply)
  const updateRequest = (updated) => {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  // When setSelectedId is called from Dashboard, jump to requests page in detail view
  const handleSelectId = (id) => {
    setSelectedId(id);
    setPage("requests");
  };

  // Requests page: if selectedId is set → show detail, else show table
  const handleBack = () => setSelectedId(null);

  // ── Auth gate ──────────────────────────────────────────────
  if (!authed) {
    return (
      <>
        <GlobalStyles />
        <Login onLogin={() => setAuthed(true)} />
      </>
    );
  }

  // ── Resolve selected request ───────────────────────────────
  const selectedRequest = selectedId
    ? requests.find(r => r.id === selectedId)
    : null;

  return (
    <>
      <GlobalStyles />
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>

        {/* Sidebar */}
        <Sidebar page={page} setPage={(p) => { setPage(p); setSelectedId(null); }} requests={requests} />

        {/* Main content */}
        <main style={{ flex: 1, overflowY: "auto", minHeight: "100vh" }}>
          {page === "dashboard" && (
            <Dashboard
              requests={requests}
              setPage={setPage}
              setSelectedId={handleSelectId}
            />
          )}

          {page === "requests" && !selectedRequest && (
            <Requests
              requests={requests}
              setSelectedId={setSelectedId}
            />
          )}

          {page === "requests" && selectedRequest && (
            <RequestDetail
              request={selectedRequest}
              onBack={handleBack}
              onUpdate={updateRequest}
            />
          )}

          {page === "settings" && <Settings />}
        </main>
      </div>
    </>
  );
}

/* ── Global style injection ───────────────────────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: ${C.bg}; }

      /* Custom scrollbar */
      ::-webkit-scrollbar       { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(33,150,196,0.25); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(33,150,196,0.45); }

      /* Date input colour fix for dark mode */
      input[type="date"] { color-scheme: dark; }
      input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }

      /* Select element */
      select { color-scheme: dark; }

      /* Smooth page transition feel */
      main > div { animation: pageIn 0.22s cubic-bezier(.25,.46,.45,.94); }
      @keyframes pageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
  );
}