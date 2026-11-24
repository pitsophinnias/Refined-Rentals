/**
 * sysadmin/pages/LoginActivity.jsx — who's signing in, failed attempts, and
 * "log out everywhere" to end every session a user has.
 */

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { system as systemApi } from "../../api.js";
import { fmtDateTime } from "../constants.js";
import { PageHeader, Panel, StatCard, Btn, RoleBadge, Table, Td, Empty, Feedback } from "../ui.jsx";

// "Mozilla/5.0 (Windows NT 10.0...) Chrome/131" → "Chrome on Windows"
function device(ua) {
  if (!ua) return "-";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export default function LoginActivity({ currentAdminId, onSignedOutSelf }) {
  const { C, F } = useTheme();
  const [data, setData]       = useState(null);
  const [fb, setFb]           = useState({ msg: "", type: "success" });
  const [confirmUser, setConfirmUser] = useState(null);
  const [busy, setBusy]       = useState(false);

  const load = useCallback(() => {
    systemApi.loginActivity().then(setData).catch(err => setFb({ msg: err.message, type: "error" }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const logoutEverywhere = async (u) => {
    setBusy(true);
    try {
      const d = await systemApi.logoutEverywhere(u.id);
      setConfirmUser(null);
      if (d.self) { onSignedOutSelf(); return; }
      setFb({ msg: `${u.email} has been signed out of every device.`, type: "success" });
      load();
    } catch (err) {
      setFb({ msg: err.message, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const failed = data?.failedLast24h ?? null;

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>
      <PageHeader title="Login Activity" subtitle="Recent sign-ins and failed attempts on the admin dashboard." action={<Btn variant="ghost" onClick={load}>Refresh</Btn>} />
      <Feedback msg={fb.msg} type={fb.type} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: "1.5rem" }}>
        <StatCard label="Failed logins (24h)" value={failed} accent={failed ? C.danger : "#1e9160"} hint={failed >= 10 ? "Unusually high. Check the IPs below." : null} />
        <StatCard label="Users" value={data?.users.length} />
        <StatCard label="Logins recorded" value={data?.recent.length} hint={data ? "Most recent 100 shown" : null} accent="#8a5ac8" />
      </div>

      <Panel title="Last Login Per User" padded={false}>
        <Table head={["User", "Last login", "Failed (24h)", ""]} empty={data && data.users.length === 0 ? <Empty>No users.</Empty> : null}>
          {(data?.users || []).map(u => (
            <tr key={u.id}>
              <Td style={{ fontWeight: 500 }}>
                {u.email}{u.id === currentAdminId && <span style={{ marginLeft: 8, fontSize: 10, color: C.textDim }}>(you)</span>}
                <div style={{ marginTop: 5 }}><RoleBadge role={u.role} /></div>
              </Td>
              <Td muted nowrap>{u.last_login_at ? fmtDateTime(u.last_login_at) : "Not since tracking began"}</Td>
              <Td nowrap style={{ color: u.failed_24h ? C.danger : C.textDim }}>{u.failed_24h}</Td>
              <Td nowrap>
                {confirmUser?.id === u.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={{ color: C.danger, fontSize: C.fontSizeSm, fontFamily: F.body, whiteSpace: "normal", maxWidth: 260 }}>
                      {u.id === currentAdminId ? "This signs you out too. Continue?" : `Sign ${u.email} out of every device?`}
                    </span>
                    <Btn small variant="danger" disabled={busy} onClick={() => logoutEverywhere(u)}>{busy ? "Signing out…" : "Yes, sign out"}</Btn>
                    <Btn small variant="ghost" onClick={() => setConfirmUser(null)}>Cancel</Btn>
                  </div>
                ) : (
                  <Btn small variant="danger" onClick={() => setConfirmUser(u)}>Log out everywhere</Btn>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Recent Logins" padded={false}>
        <Table head={["Time", "Email", "Result", "IP address", "Device"]} empty={data && data.recent.length === 0 ? <Empty>No login activity yet. Logins are recorded from this update onwards.</Empty> : null}>
          {(data?.recent || []).map(l => (
            <tr key={l.id}>
              <Td muted nowrap>{fmtDateTime(l.created_at)}</Td>
              <Td>{l.email || "-"}</Td>
              <Td nowrap>
                <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: F.body, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: l.success ? "rgba(30,145,96,0.12)" : "rgba(217,79,79,0.12)", color: l.success ? "#1e9160" : C.danger }}>
                  {l.success ? "Success" : "Failed"}
                </span>
              </Td>
              <Td muted nowrap>{l.ip || "-"}</Td>
              <Td muted>{device(l.user_agent)}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
