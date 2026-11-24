/**
 * sysadmin/pages/Backups.jsx — nightly database + uploads backups made by
 * backend/scripts/backup.js on the server. Shows run history, the files on
 * disk (download to keep a copy off the server), and a "Back up now" button.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { system as systemApi } from "../../api.js";
import { fmtDateTime, fmtBytes } from "../constants.js";
import { PageHeader, Panel, StatCard, Btn, Table, Td, Empty, Feedback } from "../ui.jsx";

export default function Backups() {
  const { C, F } = useTheme();
  const [d, setD]       = useState(null);
  const [fb, setFb]     = useState({ msg: "", type: "success" });
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const poll = useRef(null);

  const load = useCallback(() => systemApi.backups().then(setD).catch(err => setFb({ msg: err.message, type: "error" })), []);
  useEffect(() => { load(); return () => clearInterval(poll.current); }, [load]);

  const runNow = async () => {
    setBusy(true);
    try {
      await systemApi.runBackup();
      setFb({ msg: "Backup started. This page updates when it finishes (usually under a minute).", type: "success" });
      const before = d?.runs?.[0]?.id;
      let tries = 0;
      clearInterval(poll.current);
      poll.current = setInterval(async () => {
        tries++;
        const next = await systemApi.backups().catch(() => null);
        if (next) setD(next);
        if ((next && next.runs[0]?.id !== before) || tries > 40) {
          clearInterval(poll.current);
          setBusy(false);
          if (next && next.runs[0]?.id !== before) {
            setFb(next.runs[0].status === "success"
              ? { msg: "Backup finished.", type: "success" }
              : { msg: `Backup failed: ${next.runs[0].message}`, type: "error" });
          }
        }
      }, 3000);
    } catch (err) {
      setFb({ msg: err.message, type: "error" });
      setBusy(false);
    }
  };

  const download = async (name) => {
    setDownloading(name);
    try { await systemApi.downloadBackup(name); }
    catch (err) { setFb({ msg: err.message, type: "error" }); }
    finally { setDownloading(null); }
  };

  const statusPill = (ok) => (
    <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: F.body, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: ok ? "rgba(30,145,96,0.12)" : "rgba(217,79,79,0.12)", color: ok ? "#1e9160" : C.danger }}>
      {ok ? "Success" : "Failed"}
    </span>
  );

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>
      <PageHeader
        title="Backups"
        subtitle="Nightly copies of the database and uploaded pictures, kept on the server."
        action={<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" onClick={load}>Refresh</Btn><Btn disabled={busy} onClick={runNow}>{busy ? "Backing up…" : "Back up now"}</Btn></div>}
      />
      <Feedback msg={fb.msg} type={fb.type} />

      {d && !d.setUp && (
        <Panel title="Not set up yet">
          <p style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>
            No backup has run on this server yet. Press <strong>Back up now</strong> to make the first one, and add the nightly schedule on the server
            (see the comment at the top of <code>backend/scripts/backup.js</code>). Backups are saved to <code>{d.location}</code> and kept for {d.keepDays} days.
          </p>
        </Panel>
      )}

      {d?.warning && (
        <div style={{ background: "rgba(217,79,79,0.1)", border: "1px solid rgba(217,79,79,0.3)", color: C.danger, borderRadius: 3, padding: "12px 14px", marginBottom: "1.25rem", fontFamily: F.body, fontSize: C.fontSize, fontWeight: 600 }}>
          {d.warning}
        </div>
      )}

      {d?.setUp && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: "1.5rem" }}>
          <StatCard label="Last successful backup" value={<span style={{ fontSize: "1.25rem" }}>{d.lastSuccessAt ? fmtDateTime(d.lastSuccessAt) : "Never"}</span>} accent={d.warning ? C.danger : "#1e9160"} />
          <StatCard label="Files on the server" value={d.files.length} hint={`Kept ${d.keepDays} days`} />
          <StatCard label="Space used" value={<span style={{ fontSize: "1.5rem" }}>{fmtBytes(d.files.reduce((n, f) => n + f.bytes, 0))}</span>} accent="#8a5ac8" />
        </div>
      )}

      {d?.setUp && (
        <div style={{ background: C.blueDim, border: `1px solid ${C.borderBlue}`, borderRadius: 3, padding: "10px 14px", marginBottom: "1.25rem", fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textSecondary, lineHeight: 1.6 }}>
          These copies live on the same server as the website. Download the latest database file now and then and keep it somewhere else (your laptop or Google Drive), so a server failure can't take the backups with it.
        </div>
      )}

      <Panel title="Files" padded={false}>
        <Table head={["File", "Type", "Size", "Created", ""]} empty={d && d.files.length === 0 ? <Empty>No backup files yet.</Empty> : null}>
          {(d?.files || []).map(f => (
            <tr key={f.name}>
              <Td style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: C.fontSizeSm - 1 }}>{f.name}</Td>
              <Td muted nowrap>{f.kind === "database" ? "Database" : "Pictures"}</Td>
              <Td muted nowrap>{fmtBytes(f.bytes)}</Td>
              <Td muted nowrap>{fmtDateTime(f.modifiedAt)}</Td>
              <Td nowrap><Btn small variant="ghost" disabled={downloading === f.name} onClick={() => download(f.name)}>{downloading === f.name ? "Downloading…" : "Download"}</Btn></Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Recent Runs" padded={false}>
        <Table head={["Finished", "Result", "How", "Database", "Pictures", "Notes"]} empty={d && d.runs.length === 0 ? <Empty>No runs yet.</Empty> : null}>
          {(d?.runs || []).map(r => (
            <tr key={r.id}>
              <Td muted nowrap>{fmtDateTime(r.finished_at)}</Td>
              <Td nowrap>{statusPill(r.status === "success")}</Td>
              <Td muted nowrap>{r.triggered_by === "manual" ? "Manual" : "Nightly"}</Td>
              <Td muted nowrap>{r.db_bytes ? fmtBytes(r.db_bytes) : "-"}</Td>
              <Td muted nowrap>{r.uploads_bytes ? fmtBytes(r.uploads_bytes) : "-"}</Td>
              <Td muted>{r.message || "-"}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
