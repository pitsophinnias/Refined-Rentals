/**
 * sysadmin/pages/SystemHealth.jsx — is everything running? Backend, database,
 * server disk, email, plus any warnings worth acting on.
 */

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { system as systemApi } from "../../api.js";
import { fmtBytes, fmtDuration } from "../constants.js";
import { PageHeader, Panel, Btn, Feedback } from "../ui.jsx";

function Line({ label, children }) {
  const { C, F } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontFamily: F.body, fontSize: C.fontSizeSm }}>
      <span style={{ color: C.textSecondary }}>{label}</span>
      <span style={{ color: C.textPrimary, textAlign: "right", overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

function Dot({ ok }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: ok ? "#1e9160" : "#d94f4f", marginRight: 7 }} />;
}

const ROW_LABELS = {
  quote_requests: "Quote requests", announcements: "Announcements", gallery: "Gallery items",
  admins: "Users", audit_log: "Audit log entries", login_events: "Login records", error_log: "Error records",
};

export default function SystemHealth({ setPage }) {
  const { C, F } = useTheme();
  const [h, setH]             = useState(null);
  const [error, setError]     = useState("");
  const [checkedAt, setCheckedAt] = useState(null);

  const load = useCallback(() => {
    systemApi.health()
      .then(d => { setH(d); setError(""); setCheckedAt(new Date()); })
      .catch(err => setError(err.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const ok = h?.status === "ok";
  const db = h?.database;

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>
      <PageHeader title="System Health" subtitle="Whether the backend, database, disk and email are working." action={<Btn variant="ghost" onClick={load}>Check again</Btn>} />
      <Feedback msg={error} type="error" />

      {h && (
        <div style={{ background: ok ? "rgba(30,145,96,0.1)" : "rgba(232,160,32,0.1)", border: `1px solid ${ok ? "rgba(30,145,96,0.3)" : "rgba(232,160,32,0.35)"}`, borderRadius: 3, padding: "1rem 1.25rem", marginBottom: "1.25rem", fontFamily: F.body }}>
          <div style={{ fontWeight: 600, color: ok ? "#1e9160" : "#d4880a", fontSize: C.fontSize }}>{ok ? "Everything looks healthy." : "Needs attention"}</div>
          {h.warnings.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: C.textPrimary, fontSize: C.fontSizeSm, lineHeight: 1.7 }}>
              {h.warnings.map(w => <li key={w}>{w}</li>)}
            </ul>
          )}
          {checkedAt && <div style={{ color: C.textDim, fontSize: C.fontSizeSm - 1, marginTop: 6 }}>Checked {checkedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        <Panel title="Backend">
          <Line label="Status"><Dot ok={Boolean(h)} />{h ? "Running" : "Unknown"}</Line>
          <Line label="Up for">{h ? fmtDuration(h.backend.uptimeSeconds) : "-"}</Line>
          <Line label="Version (commit)">{h?.backend.version || "-"}</Line>
          <Line label="Environment">{h?.backend.environment || "-"}</Line>
          <Line label="Node.js">{h?.backend.nodeVersion || "-"}</Line>
          <Line label="Memory">{h ? `${h.backend.memory.rssMb} MB (heap ${h.backend.memory.heapUsedMb} MB)` : "-"}</Line>
        </Panel>

        <Panel title="Database">
          <Line label="Reachable"><Dot ok={db?.reachable} />{db ? (db.reachable ? "Yes" : "No") : "-"}</Line>
          <Line label="Response time">{db?.responseTimeMs != null ? `${db.responseTimeMs} ms` : "-"}</Line>
          <Line label="Size">{fmtBytes(db?.sizeBytes)}</Line>
        </Panel>

        <Panel title="Server Disk">
          <Line label="Used">{h?.disk ? `${h.disk.usedPercent}%` : "-"}</Line>
          <Line label="Free">{fmtBytes(h?.disk?.freeBytes)}</Line>
          <Line label="Total">{fmtBytes(h?.disk?.totalBytes)}</Line>
          <Line label="Uploaded files">{fmtBytes(h?.uploadsBytes)}</Line>
        </Panel>

        <Panel title="Services">
          <Line label="Email (Resend)"><Dot ok={h?.services.email.configured} />{h ? (h.services.email.configured ? "Configured" : "Not configured") : "-"}</Line>
          <Line label="Email sender"><Dot ok={h?.services.email.sender} />{h ? (h.services.email.sender ? "Own domain" : "Test sender") : "-"}</Line>
          <Line label="Extra notification recipients">{h?.services.email.extraRecipients ?? "-"}</Line>
          <Line label="Last good backup">
            {h ? <button onClick={() => setPage("backups")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: !h.backup.setUp || h.backup.lastStatus === "failed" ? C.danger : C.textPrimary, fontFamily: F.body, fontSize: C.fontSizeSm }}>
              {h.backup.setUp ? (h.backup.lastSuccessAt ? new Date(h.backup.lastSuccessAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never") : "Not set up"} →
            </button> : "-"}
          </Line>
          <Line label="Maintenance mode">
            {h ? <button onClick={() => setPage("controls")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: h.maintenance.enabled ? "#d4880a" : C.textPrimary, fontFamily: F.body, fontSize: C.fontSizeSm }}>{h.maintenance.enabled ? "ON" : "Off"} →</button> : "-"}
          </Line>
          <Line label="Unresolved errors (24h)">
            {h ? <button onClick={() => setPage("errors")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: h.errorsLast24h ? C.danger : C.textPrimary, fontFamily: F.body, fontSize: C.fontSizeSm }}>{h.errorsLast24h}{h.errorsLast24h ? " →" : ""}</button> : "-"}
          </Line>
          <Line label="Failed logins (24h)">
            {h ? <button onClick={() => setPage("logins")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: h.failedLoginsLast24h >= 10 ? C.danger : C.textPrimary, fontFamily: F.body, fontSize: C.fontSizeSm }}>{h.failedLoginsLast24h}{h.failedLoginsLast24h ? " →" : ""}</button> : "-"}
          </Line>
        </Panel>
      </div>

      <Panel title="Row Counts">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 28 }}>
          {Object.entries(db?.rowCounts || {}).map(([k, v]) => <Line key={k} label={ROW_LABELS[k] || k}>{v}</Line>)}
        </div>
      </Panel>
    </div>
  );
}
