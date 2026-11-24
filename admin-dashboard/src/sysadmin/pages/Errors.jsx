/**
 * sysadmin/pages/Errors.jsx — server errors, grouped so one recurring problem
 * shows once with a count. Mark a group resolved once it's dealt with.
 */

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { system as systemApi } from "../../api.js";
import { fmtDateTime } from "../constants.js";
import { PageHeader, Panel, Btn, Table, Td, Empty, Feedback } from "../ui.jsx";
import { useInputStyle } from "../useInputStyle.js";

export default function Errors() {
  const { C, F } = useTheme();
  const input = useInputStyle();
  const [filters, setFilters] = useState({ resolved: "", days: "" });
  const [rows, setRows]       = useState([]);
  const [loadedKey, setLoadedKey] = useState(null);
  const [fb, setFb]           = useState({ msg: "", type: "success" });
  const [busy, setBusy]       = useState(false);
  const [reload, setReload]   = useState(0);

  const key = JSON.stringify([filters, reload]);
  const loading = loadedKey !== key;

  const load = useCallback((f, k) => {
    systemApi.errors(f)
      .then(d => setRows(d.errors || []))
      .catch(err => setFb({ msg: err.message, type: "error" }))
      .finally(() => setLoadedKey(k));
  }, []);
  useEffect(() => { load(filters, key); }, [filters, key, load]);

  const resolve = async (ids, label) => {
    setBusy(true);
    try {
      const d = await systemApi.resolveErrors(ids);
      setFb({ msg: `${label}: ${d.resolved} marked resolved.`, type: "success" });
      setReload(r => r + 1);
    } catch (err) {
      setFb({ msg: err.message, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const open = rows.filter(r => !r.resolved);
  const selectStyle = { ...input, width: "auto", minWidth: 160, padding: "7px 10px", fontSize: C.fontSizeSm };

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 1200 }}>
      <PageHeader
        title="Errors"
        subtitle="Server errors, with repeats grouped together. Emails, phone numbers and secrets are removed before saving."
        action={open.length > 0 && <Btn variant="ghost" disabled={busy} onClick={() => resolve(open.flatMap(r => r.ids), "All shown")}>Resolve all shown</Btn>}
      />
      <Feedback msg={fb.msg} type={fb.type} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
        <select aria-label="Status" value={filters.resolved} onChange={e => setFilters(f => ({ ...f, resolved: e.target.value }))} style={selectStyle}>
          <option value="">Unresolved</option>
          <option value="all">All, including resolved</option>
        </select>
        <select aria-label="Period" value={filters.days} onChange={e => setFilters(f => ({ ...f, days: e.target.value }))} style={selectStyle}>
          <option value="">All time (last 30 days kept)</option>
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
        <span style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textDim, marginLeft: "auto" }}>{rows.length} {rows.length === 1 ? "group" : "groups"}</span>
      </div>

      <Panel padded={false}>
        <Table head={["Where", "Message", "Status", "Count", "Last seen", ""]} empty={loading ? <Empty>Loading…</Empty> : rows.length === 0 ? <Empty>No errors match these filters.</Empty> : null}>
          {!loading && rows.map(r => (
            <tr key={r.ids[0]} style={{ opacity: r.resolved ? 0.55 : 1 }}>
              <Td>
                <div style={{ fontWeight: 500 }}>{r.context || "Error"}</div>
                <div style={{ color: C.textDim, fontSize: C.fontSizeSm - 1, marginTop: 3 }}>{[r.method, r.route].filter(Boolean).join(" ") || "Background task"}</div>
              </Td>
              <Td muted style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: C.fontSizeSm - 1, maxWidth: 420 }}>{r.message || "-"}</Td>
              <Td nowrap>{r.status ?? "-"}</Td>
              <Td nowrap style={{ fontWeight: 600, color: r.count > 1 ? C.danger : C.textPrimary }}>{r.count}</Td>
              <Td muted nowrap>{fmtDateTime(r.last_seen)}</Td>
              <Td nowrap>{r.resolved ? <span style={{ color: "#1e9160", fontSize: C.fontSizeSm }}>Resolved</span> : <Btn small variant="ghost" disabled={busy} onClick={() => resolve(r.ids, r.context || "Error")}>Mark resolved</Btn>}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
