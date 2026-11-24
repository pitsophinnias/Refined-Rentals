/**
 * sysadmin/pages/Overview.jsx — system at a glance: stat cards, recent users,
 * and recent security events (account, role and password changes).
 */

import { useEffect, useState } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { system as systemApi } from "../../api.js";
import { fmtDateTime } from "../constants.js";
import { PageHeader, Panel, StatCard, RoleBadge, ActionBadge, Table, Td, Empty, Feedback } from "../ui.jsx";

export default function Overview({ setPage }) {
  const { C, F } = useTheme();
  const [data, setData]   = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    systemApi.overview().then(setData).catch(err => setError(err.message));
  }, []);

  const c = data?.counts;
  const link = (page, text) => (
    <button onClick={() => setPage(page)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontFamily: F.body, fontSize: C.fontSizeSm, padding: 0 }}>{text} →</button>
  );

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>
      <PageHeader title="Overview" subtitle="Accounts, activity and the state of the business data at a glance." />
      <Feedback msg={error} type="error" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: "1.5rem" }}>
        <StatCard label="Users" value={c?.users} hint={c ? `${c.byRole.ADMIN || 0} admin · ${c.byRole.SYSADMIN || 0} system admin` : null} accent={C.danger} />
        <StatCard label="Quote requests" value={c?.requests} hint={c ? `${c.openRequests} open (new or in review)` : null} />
        <StatCard label="Active announcements" value={c?.announcements} accent="#e8a020" />
        <StatCard label="Gallery items" value={c?.gallery} accent="#1e9160" />
        <StatCard label="Audit events (7 days)" value={c?.auditLast7Days} accent="#8a5ac8" />
      </div>

      <Panel title="Recent Users" right={link("users", "All users")} padded={false}>
        <Table head={["Email", "Role", "Created"]} empty={data && data.recentUsers.length === 0 ? <Empty>No users yet.</Empty> : null}>
          {(data?.recentUsers || []).map(u => (
            <tr key={u.id}>
              <Td style={{ fontWeight: 500 }}>{u.email}</Td>
              <Td><RoleBadge role={u.role} /></Td>
              <Td muted nowrap>{fmtDateTime(u.created_at)}</Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Security Events" right={link("audit", "Full audit log")} padded={false}>
        <Table head={["Time", "By", "Event", "Details"]} empty={data && data.securityEvents.length === 0 ? <Empty>No account or permission changes yet.</Empty> : null}>
          {(data?.securityEvents || []).map(e => (
            <tr key={e.id}>
              <Td muted nowrap>{fmtDateTime(e.created_at)}</Td>
              <Td>{e.admin_email || "-"}</Td>
              <Td><ActionBadge action={e.action} /></Td>
              <Td muted>{e.detail || "-"}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
