/**
 * sysadmin/pages/AuditLog.jsx — the full audit log, filterable by user and
 * action, 25 per page.
 */

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { audit as auditApi, system as systemApi, users as usersApi } from "../../api.js";
import { actionLabel, fmtDateTime } from "../constants.js";
import { PageHeader, Panel, Btn, ActionBadge, Table, Td, Empty, Feedback } from "../ui.jsx";
import { useInputStyle } from "../useInputStyle.js";

const LIMIT = 25;

export default function AuditLog() {
  const { C, F } = useTheme();
  const input = useInputStyle();
  const [log, setLog]         = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loadedKey, setLoadedKey] = useState(null); // which page+filters the table currently shows
  const [error, setError]     = useState("");
  const [filters, setFilters] = useState({ admin_id: "", action: "" });
  const [actions, setActions] = useState([]);
  const [people, setPeople]   = useState([]);

  useEffect(() => {
    systemApi.auditActions().then(d => setActions(d.actions || [])).catch(() => {});
    usersApi.list().then(d => setPeople(d.users || [])).catch(() => {});
  }, []);

  const key = JSON.stringify([page, filters]);
  const loading = loadedKey !== key;

  const load = useCallback((p, f, k) => {
    auditApi.list({ ...f, limit: LIMIT, offset: p * LIMIT })
      .then(d => { setLog(d.log || []); setTotal(d.total || 0); setError(""); })
      .catch(err => setError(err.message))
      .finally(() => setLoadedKey(k));
  }, []);

  useEffect(() => { load(page, filters, key); }, [page, filters, key, load]);

  const setFilter = (key, value) => { setPage(0); setFilters(f => ({ ...f, [key]: value })); };
  const selectStyle = { ...input, width: "auto", minWidth: 180, padding: "7px 10px", fontSize: C.fontSizeSm };
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>
      <PageHeader title="Audit Log" subtitle="Everything staff and admins have done, newest first." />
      <Feedback msg={error} type="error" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
        <select aria-label="Filter by user" value={filters.admin_id} onChange={e => setFilter("admin_id", e.target.value)} style={selectStyle}>
          <option value="">All users</option>
          {people.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
        </select>
        <select aria-label="Filter by action" value={filters.action} onChange={e => setFilter("action", e.target.value)} style={selectStyle}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <span style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textDim, marginLeft: "auto" }}>{total} {total === 1 ? "event" : "events"}</span>
      </div>

      <Panel padded={false}>
        <Table head={["Time", "User", "Action", "Details"]} empty={loading ? <Empty>Loading…</Empty> : log.length === 0 ? <Empty>No events match these filters.</Empty> : null}>
          {!loading && log.map(e => (
            <tr key={e.id}>
              <Td muted nowrap>{fmtDateTime(e.created_at)}</Td>
              <Td>{e.admin_email || "-"}</Td>
              <Td><ActionBadge action={e.action} /></Td>
              <Td muted>
                {e.entity_id && <span style={{ color: C.blue, marginRight: 6 }}>{e.entity_id}</span>}
                {e.detail || "-"}
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textDim }}>Page {page + 1} of {pages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous</Btn>
            <Btn small variant="ghost" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Next →</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
