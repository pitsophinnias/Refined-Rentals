/**
 * pages/Requests.jsx
 * Full table of all quote requests with status filters and search.
 */

import { useState } from "react";
import { useTheme } from "../ThemeProvider.jsx";
import { F, fmtDate, timeAgo, statusToken } from "../tokens.js";
import { usePermissions } from "../usePermissions.js";
import StatusBadge from "../components/StatusBadge.jsx";
import NewRequestModal from "../components/NewRequestModal.jsx";

const FILTERS = ["ALL", "NEW", "REVIEW", "QUOTED", "CLOSED"];

export default function Requests({ requests, setSelectedId, onRequestCreated }) {
  const { C, F } = useTheme();
  const { can } = usePermissions();

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState("newest"); // newest | oldest | event_date
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = requests
    .filter(r => filter === "ALL" || r.status === filter)
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q)    ||
        r.email.toLowerCase().includes(q)   ||
        r.event.toLowerCase().includes(q)   ||
        r.location.toLowerCase().includes(q)||
        r.id.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "newest")     return new Date(b.submitted_at) - new Date(a.submitted_at);
      if (sort === "oldest")     return new Date(a.submitted_at) - new Date(b.submitted_at);
      if (sort === "event_date") return new Date(a.date || a.start_date) - new Date(b.date || b.start_date);
      return 0;
    });

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === "ALL" ? requests.length : requests.filter(r => r.status === f).length;
    return acc;
  }, {});

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: "1.75rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontFamily: F.body, marginBottom: 6 }}>
            Manage
          </div>
          <h1 style={{ fontFamily: F.display, fontSize: "2rem", fontWeight: 500, color: C.textPrimary, margin: 0 }}>
            Quote Requests
          </h1>
        </div>

        {can("review") && (
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              background: C.blue, border: "none", borderRadius: 2,
              color: C.white, cursor: "pointer",
              padding: "10px 18px", fontSize: 11,
              letterSpacing: "0.16em", textTransform: "uppercase",
              fontWeight: 600, fontFamily: F.body,
              transition: "background 0.25s", flexShrink: 0,
              marginTop: 2,
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.blueLight}
            onMouseLeave={e => e.currentTarget.style.background = C.blue}
          >+ New Request</button>
        )}
      </div>

      {showNewModal && (
        <NewRequestModal
          onClose={() => setShowNewModal(false)}
          onCreated={(request) => {
            setShowNewModal(false);
            onRequestCreated(request);
          }}
        />
      )}

      {/* Filters + Search + Sort */}
      <div style={{ display: "flex", gap: 12, marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Status filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? C.blue : "transparent",
                border: `1px solid ${filter === f ? C.blue : C.border}`,
                color: filter === f ? C.white : C.textSecondary,
                padding: "6px 14px", borderRadius: 2,
                fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
                fontWeight: 600, fontFamily: F.body, cursor: "pointer",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {f === "ALL" ? "All" : f === "REVIEW" ? "In Review" : f.charAt(0) + f.slice(1).toLowerCase()}
              <span style={{
                background: filter === f ? "rgba(255,255,255,0.2)" : C.blueDim,
                color: filter === f ? C.white : C.blue,
                padding: "1px 6px", borderRadius: 8,
                fontSize: 9.5, fontWeight: 700,
              }}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg viewBox="0 0 16 16" fill="none" style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            width: 13, height: 13, color: C.textDim, pointerEvents: "none",
          }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, event, location…"
            style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 2, padding: "8px 12px 8px 30px",
              color: C.textPrimary, fontSize: "0.85rem",
              fontFamily: F.body, fontWeight: 300, outline: "none",
              width: 240, transition: "border-color 0.25s",
            }}
            onFocus={e => e.target.style.borderColor = C.blue}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 2, padding: "8px 12px",
            color: C.textSecondary, fontSize: "0.85rem",
            fontFamily: F.body, outline: "none", cursor: "pointer",
          }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="event_date">By event date</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 3, overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr 140px 140px 120px 90px",
          padding: "10px 1.25rem",
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(255,255,255,0.02)",
        }}>
          {["Ref", "Client", "Event", "Date", "Services", "Status"].map(h => (
            <div key={h} style={{
              fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
              color: C.textDim, fontFamily: F.body, fontWeight: 600,
            }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: C.textDim, fontFamily: F.body, fontSize: "0.88rem" }}>
            No requests match your filter.
          </div>
        ) : (
          filtered.map((r, i) => (
            <div
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 140px 140px 120px 90px",
                padding: "0.9rem 1.25rem",
                borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                cursor: "pointer", alignItems: "center",
                transition: "background 0.18s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* Ref */}
              <div style={{ fontSize: 11, color: C.blue, fontFamily: F.body, fontWeight: 600 }}>{r.id}</div>

              {/* Client */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                  <span style={{ fontFamily: F.body, fontSize: "0.88rem", fontWeight: 500, color: C.textPrimary }}>{r.name}</span>
                  {r.source === "manual" && (
                    <span title="Entered manually: WhatsApp / Call" style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      background: "rgba(232,160,32,0.12)", color: "#d4880a",
                      padding: "1px 7px", borderRadius: 8,
                      fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                      fontWeight: 700, fontFamily: F.body, whiteSpace: "nowrap",
                    }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#d4880a" }} />
                      Manual
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.textDim, fontFamily: F.body }}>{r.email}</div>
              </div>

              {/* Event */}
              <div>
                <div style={{ fontFamily: F.body, fontSize: "0.85rem", color: C.textSecondary }}>{r.event}</div>
                <div style={{ fontSize: 11, color: C.textDim, fontFamily: F.body }}>{r.location}</div>
              </div>

              {/* Event date */}
              <div style={{ fontFamily: F.body, fontSize: "0.85rem", color: C.textSecondary }}>
                {(() => {
                  // Multiple days
                  if (r.start_date && r.end_date && r.start_date !== r.end_date) {
                    return (
                      <>
                        {fmtDate(r.start_date)}
                        <br/>
                        <span style={{ fontSize: 11, color: C.textDim }}>– {fmtDate(r.end_date)}</span>
                      </>
                    );
                  }
                  // Single or overnight
                  const d = r.date || r.start_date;
                  return d ? fmtDate(d) : <span style={{ color: C.textDim }}>-</span>;
                })()}
              </div>

              {/* Services */}
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>
                {(() => {
                  const svcs = (r.services || [])
                    .map(s => {
                      if (typeof s === "string") return s;
                      if (s && typeof s === "object" && s.name) return s.name;
                      return null;
                    })
                    .filter(Boolean);
                  if (svcs.length === 0) return <span style={{ color: C.textDim }}>-</span>;
                  return (
                    <>
                      {svcs.slice(0, 2).join(", ")}
                      {svcs.length > 2 && <span style={{ color: C.blue }}> +{svcs.length - 2}</span>}
                    </>
                  );
                })()}
              </div>

              {/* Status */}
              <StatusBadge status={r.status} size="sm" />
            </div>
          ))
        )}
      </div>

      <p style={{ marginTop: "0.75rem", color: C.textDim, fontSize: 11, fontFamily: F.body, fontWeight: 300 }}>
        {filtered.length} of {requests.length} requests
      </p>
    </div>
  );
}