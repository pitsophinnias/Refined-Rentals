/**
 * pages/Dashboard.jsx
 * Stats strip, recent requests, month-grid calendar for quoted/accepted events.
 */

import { useState } from "react";
import { useTheme } from "../ThemeProvider.jsx";
import { F, timeAgo, statusToken } from "../tokens.js";
import StatusBadge from "../components/StatusBadge.jsx";

function StatCard({ label, value, sub, accent, C }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1.5rem", position: "relative", overflow: "hidden", transition: "background 0.3s, border-color 0.3s" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent ?? C.blue, borderRadius: "3px 0 0 3px" }} />
      <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.textDim, fontFamily: F.body, marginBottom: "0.6rem" }}>{label}</div>
      <div style={{ fontFamily: F.display, fontSize: "2.4rem", fontWeight: 500, color: C.textPrimary, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body, marginTop: "0.4rem", fontWeight: 300 }}>{sub}</div>}
    </div>
  );
}

function EventCalendar({ requests, onSelectId, C }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_NAMES   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  // Mon=0 offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Events that overlap this month (start before month ends, end after month starts)
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd   = new Date(viewYear, viewMonth + 1, 0); // last day of month

  const relevant = requests.filter(r => {
    if (!r.date && !r.start_date) return false;
    if (r.status === "CLOSED" && r.closed_reason === "REJECTED") return false;
    const evStart = new Date(r.date || r.start_date);
    const evEnd   = r.duration === "multiple" && r.end_date ? new Date(r.end_date) : evStart;
    // Include if the event overlaps at all with this month
    return evStart <= monthEnd && evEnd >= monthStart;
  });

  // Map each event to every day it occupies within this month
  const eventsByDay = {};
  relevant.forEach(r => {
    const evStart    = new Date(r.date || r.start_date);
    const evEnd      = r.duration === "multiple" && r.end_date ? new Date(r.end_date) : evStart;
    // Clamp to this month
    const clampStart = Math.max(evStart.getDate(), evStart.getMonth() === viewMonth && evStart.getFullYear() === viewYear ? evStart.getDate() : 1);
    const clampEnd   = Math.min(evEnd.getDate(),   evEnd.getMonth()   === viewMonth && evEnd.getFullYear()   === viewYear ? evEnd.getDate()   : daysInMonth);
    // Fill every day in range
    for (let d = clampStart; d <= clampEnd; d++) {
      if (!eventsByDay[d]) eventsByDay[d] = [];
      // Tag each entry with its position in the span for styling
      const isFirst = d === clampStart;
      const isLast  = d === clampEnd;
      eventsByDay[d].push({ ...r, _spanFirst: isFirst, _spanLast: isLast, _spanMid: !isFirst && !isLast });
    }
  });

  const todayDate = today.getDate();
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // Total cells: offset + daysInMonth, rounded up to multiple of 7
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, overflow: "hidden", transition: "background 0.3s" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: F.display, fontSize: "1.1rem", fontWeight: 500, color: C.textPrimary }}>Event Calendar</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prevMonth} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 2, width: 28, height: 28, cursor: "pointer", color: C.textSecondary, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ fontFamily: F.body, fontSize: C.fontSize, fontWeight: 600, color: C.textPrimary, minWidth: 120, textAlign: "center" }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button onClick={nextMonth} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 2, width: 28, height: 28, cursor: "pointer", color: C.textSecondary, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "0.5rem 1.25rem", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 16 }}>
        {[["#e8a020", "New"], ["#2196c4", "In Review"], ["#1e9160", "Quoted / Accepted"]].map(([color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${C.border}` }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ padding: "6px 0", textAlign: "center", fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.06em" }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {Array.from({ length: totalCells }).map((_, idx) => {
          const day = idx - startOffset + 1;
          const valid = day >= 1 && day <= daysInMonth;
          const isToday = valid && isCurrentMonth && day === todayDate;
          const events = valid ? (eventsByDay[day] || []) : [];

          return (
            <div key={idx} style={{
              minHeight: 64, padding: "6px", border: `1px solid ${C.border}`,
              borderTop: "none", borderLeft: idx % 7 === 0 ? "none" : `1px solid ${C.border}`,
              background: isToday ? C.blueDim : valid ? C.surface : C.bg,
              position: "relative", transition: "background 0.2s",
            }}>
              {valid && (
                <>
                  <div style={{ fontSize: C.fontSizeSm, fontWeight: isToday ? 700 : 400, color: isToday ? C.blue : C.textDim, fontFamily: F.body, marginBottom: 4 }}>{day}</div>
                  {events.slice(0, 2).map((r, ei) => {
                    const color = r.status === "NEW" ? "#e8a020" : r.status === "REVIEW" ? "#2196c4" : "#1e9160";
                    // Spanning bar: remove radius on sides that continue to adjacent cells
                    const borderRadius = r._spanMid
                      ? "0"
                      : r._spanFirst && !r._spanLast
                      ? "2px 0 0 2px"
                      : r._spanLast && !r._spanFirst
                      ? "0 2px 2px 0"
                      : "2px";
                    // Extend bar to cell edge on continuation sides
                    const marginLeft  = r._spanMid || r._spanLast  ? "-6px" : 0;
                    const marginRight = r._spanMid || r._spanFirst && !r._spanLast ? "-7px" : 0;
                    return (
                      <div key={`${r.id}-${ei}`} onClick={() => onSelectId(r.id)} title={`${r.name}: ${r.event}`}
                        style={{
                          background: color, borderRadius,
                          padding: "2px 5px", marginBottom: 2,
                          marginLeft, marginRight,
                          cursor: "pointer",
                          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                          fontSize: 10, color: "#fff", fontFamily: F.body, fontWeight: 500,
                        }}>
                        {/* Only show name on first day of span */}
                        {r._spanFirst || (!r._spanFirst && !r._spanMid && !r._spanLast)
                          ? r.name.split(" ")[0]
                          : " " /* non-breaking space to keep bar height */}
                      </div>
                    );
                  })}
                  {events.length > 2 && (
                    <div style={{ fontSize: 9, color: C.textDim, fontFamily: F.body }}>+{events.length - 2} more</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ requests, setPage, setSelectedId }) {
  const { C, F } = useTheme();

  const counts = {
    total:  requests.length,
    new:    requests.filter(r => r.status === "NEW").length,
    review: requests.filter(r => r.status === "REVIEW").length,
    quoted: requests.filter(r => r.status === "QUOTED").length,
  };

  const recent = [...requests]
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, 5);

  const openDetail = (id) => { setSelectedId(id); setPage("requests"); };

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontFamily: F.body, marginBottom: 6 }}>Overview</div>
        <h1 style={{ fontFamily: F.display, fontSize: "2rem", fontWeight: 500, color: C.textPrimary, margin: 0 }}>Good day, Admin</h1>
        <p style={{ color: C.textSecondary, fontSize: C.fontSize, fontFamily: F.body, fontWeight: 300, margin: "0.35rem 0 0" }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: "2rem" }}>
        <StatCard C={C} label="Total Requests"  value={counts.total}  sub="All time"              accent={C.blue}   />
        <StatCard C={C} label="New"             value={counts.new}    sub="Awaiting review"        accent="#2196c4"  />
        <StatCard C={C} label="In Review"       value={counts.review} sub="Being worked on"        accent="#e8a020"  />
        <StatCard C={C} label="Quotes Sent"     value={counts.quoted} sub="Awaiting confirmation"  accent="#27a86e"  />
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }} className="rr-dash-grid">

        {/* Recent requests */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, transition: "background 0.3s" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: F.display, fontSize: "1.1rem", fontWeight: 500, color: C.textPrimary }}>Recent Requests</span>
            <button onClick={() => setPage("requests")} style={{ background: "none", border: "none", cursor: "pointer", color: C.blue, fontSize: C.fontSizeSm, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: F.body, fontWeight: 600, padding: 0 }}>View all →</button>
          </div>
          <div>
            {recent.map((r, i) => (
              <div key={r.id} onClick={() => openDetail(r.id)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "1rem 1.5rem", borderBottom: i < recent.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.blueDim, border: `1px solid ${C.borderBlue}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.blue }}>
                  {r.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.body, fontSize: C.fontSize, fontWeight: 500, color: C.textPrimary, marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.event} · {r.services?.slice(0, 2).map(s => typeof s === "object" ? s.name : s).join(", ")}{r.services?.length > 2 ? ` +${r.services.length - 2}` : ""}
                  </div>
                  {(r.date || r.start_date) && (
                    <div style={{ fontSize: C.fontSizeSm - 1, color: C.blue, fontFamily: F.body, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <svg viewBox="0 0 12 12" fill="none" style={{ width: 10, height: 10, flexShrink: 0 }}>
                        <rect x="1" y="2" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      {r.duration === "multiple"
                        ? `${new Date(r.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(r.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        : new Date(r.date || r.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      }
                      {r.duration === "overnight" && <span style={{ opacity: 0.6 }}>(overnight)</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                  <StatusBadge status={r.status} size="sm" />
                  <span style={{ fontSize: C.fontSizeSm - 1, color: C.textDim, fontFamily: F.body }}>{timeAgo(r.submitted_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <EventCalendar requests={requests} onSelectId={openDetail} C={C} />
      </div>

      <style>{`@media(max-width:900px){.rr-dash-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}