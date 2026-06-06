/**
 * pages/Dashboard.jsx
 * Overview: stats strip, recent requests, upcoming events.
 */

import { C, F, fmtDate, timeAgo } from "../tokens.js";
import StatusBadge from "../components/StatusBadge.jsx";

/* ── Stat card ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 3, padding: "1.5rem",
      position: "relative", overflow: "hidden",
    }}>
      {/* Left accent stripe */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 3, background: accent ?? C.blue, borderRadius: "3px 0 0 3px",
      }}/>
      <div style={{
        fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
        color: C.textDim, fontFamily: F.body, marginBottom: "0.6rem",
      }}>{label}</div>
      <div style={{
        fontFamily: F.display, fontSize: "2.4rem", fontWeight: 500,
        color: C.textPrimary, lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: C.textDim, fontFamily: F.body, marginTop: "0.4rem", fontWeight: 300 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── Upcoming event row ─────────────────────────────────────── */
function UpcomingRow({ req }) {
  const daysUntil = Math.ceil((new Date(req.date) - Date.now()) / 86400000);
  const urgent    = daysUntil <= 7;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "10px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Date block */}
      <div style={{
        width: 44, textAlign: "center", flexShrink: 0,
        background: urgent ? "rgba(232,160,32,0.1)" : C.blueDim,
        border: `1px solid ${urgent ? "rgba(232,160,32,0.25)" : C.borderBlue}`,
        borderRadius: 2, padding: "6px 0",
      }}>
        <div style={{
          fontSize: 16, fontFamily: F.display, fontWeight: 600,
          color: urgent ? "#e8a020" : C.blue, lineHeight: 1,
        }}>
          {new Date(req.date).getDate()}
        </div>
        <div style={{
          fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase",
          color: C.textDim, fontFamily: F.body,
        }}>
          {new Date(req.date).toLocaleString("en-GB", { month: "short" })}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: F.body, fontSize: "0.88rem", fontWeight: 500,
          color: C.textPrimary, marginBottom: 2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{req.name}</div>
        <div style={{
          fontSize: 11, color: C.textDim, fontFamily: F.body,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{req.event} · {req.location}</div>
      </div>

      <div style={{ fontSize: 11, color: urgent ? "#e8a020" : C.textDim, fontFamily: F.body, flexShrink: 0 }}>
        {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────── */
export default function Dashboard({ requests, setPage, setSelectedId }) {
  const now = Date.now();

  const counts = {
    total:  requests.length,
    new:    requests.filter(r => r.status === "NEW").length,
    review: requests.filter(r => r.status === "REVIEW").length,
    quoted: requests.filter(r => r.status === "QUOTED").length,
  };

  // Sort by submitted — newest first
  const recent = [...requests]
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, 5);

  // Upcoming confirmed events (QUOTED or REVIEW with future date)
  const upcoming = requests
    .filter(r => new Date(r.date) > now && ["QUOTED", "REVIEW"].includes(r.status))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const openDetail = (id) => { setSelectedId(id); setPage("requests"); };

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{
          fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase",
          color: C.blue, fontFamily: F.body, marginBottom: 6,
        }}>Overview</div>
        <h1 style={{
          fontFamily: F.display, fontSize: "2rem", fontWeight: 500,
          color: C.textPrimary, margin: 0,
        }}>Good day, Admin</h1>
        <p style={{
          color: C.textSecondary, fontSize: "0.88rem",
          fontFamily: F.body, fontWeight: 300, margin: "0.35rem 0 0",
        }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14, marginBottom: "2rem",
      }}>
        <StatCard label="Total Requests"   value={counts.total}  sub="All time"             accent={C.blue} />
        <StatCard label="New"              value={counts.new}    sub="Awaiting review"       accent="#2196c4" />
        <StatCard label="In Review"        value={counts.review} sub="Being worked on"       accent="#e8a020" />
        <StatCard label="Quotes Sent"      value={counts.quoted} sub="Awaiting confirmation" accent="#27a86e" />
      </div>

      {/* Two columns: recent + upcoming */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }} className="rr-dash-grid">

        {/* Recent requests */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3 }}>
          <div style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: F.display, fontSize: "1.1rem", fontWeight: 500, color: C.textPrimary }}>
              Recent Requests
            </span>
            <button onClick={() => setPage("requests")} style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.blue, fontSize: 11, letterSpacing: "0.14em",
              textTransform: "uppercase", fontFamily: F.body, fontWeight: 600,
              padding: 0,
            }}>View all →</button>
          </div>

          <div>
            {recent.map((r, i) => (
              <div
                key={r.id}
                onClick={() => openDetail(r.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "1rem 1.5rem",
                  borderBottom: i < recent.length - 1 ? `1px solid ${C.border}` : "none",
                  cursor: "pointer", transition: "background 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Avatar initials */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: C.blueDim, border: `1px solid ${C.borderBlue}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.blue,
                }}>
                  {r.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.body, fontSize: "0.88rem", fontWeight: 500, color: C.textPrimary, marginBottom: 2 }}>
                    {r.name}
                  </div>
                  <div style={{
                    fontSize: 11, color: C.textDim, fontFamily: F.body,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {r.event} · {r.services.slice(0, 2).join(", ")}{r.services.length > 2 ? " +" + (r.services.length - 2) : ""}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                  <StatusBadge status={r.status} size="sm" />
                  <span style={{ fontSize: 10, color: C.textDim, fontFamily: F.body }}>{timeAgo(r.submitted_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3 }}>
          <div style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{ fontFamily: F.display, fontSize: "1.1rem", fontWeight: 500, color: C.textPrimary }}>
              Upcoming Events
            </span>
          </div>

          <div style={{ padding: "0.5rem 1.5rem 1.25rem" }}>
            {upcoming.length === 0 ? (
              <p style={{ color: C.textDim, fontSize: "0.85rem", fontFamily: F.body, fontWeight: 300, padding: "1rem 0" }}>
                No upcoming confirmed events.
              </p>
            ) : (
              upcoming.map(r => <UpcomingRow key={r.id} req={r} />)
            )}
          </div>
        </div>
      </div>

      <style>{`@media(max-width:900px){.rr-dash-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}