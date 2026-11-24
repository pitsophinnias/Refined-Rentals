/**
 * sysadmin/pages/Users.jsx — every account, any role (including System Admin).
 * Uses the same /api/settings/users routes as the client's Settings page.
 */

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { users as usersApi } from "../../api.js";
import { SYSADMIN_ASSIGNABLE_ROLES, ROLE_LABELS } from "../../usePermissions.js";
import { fmtDateTime } from "../constants.js";
import { PageHeader, Panel, Btn, Field, Feedback, RoleBadge, Table, Td, Empty } from "../ui.jsx";
import { useInputStyle } from "../useInputStyle.js";

export default function Users({ currentAdminId }) {
  const { C, F } = useTheme();
  const input = useInputStyle();
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [fb, setFb]             = useState({ msg: "", type: "success" });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]         = useState({ email: "", password: "", role: "VIEWER" });
  const [resetId, setResetId]   = useState(null);
  const [resetPass, setResetPass] = useState("");
  const [removeId, setRemoveId] = useState(null);
  const [busy, setBusy]         = useState(false);

  const flash = useCallback((msg, type = "success") => { setFb({ msg, type }); setTimeout(() => setFb({ msg: "", type: "success" }), 4500); }, []);
  const load = useCallback(() => usersApi.list().then(d => setList(d.users || [])).catch(err => flash(err.message, "error")).finally(() => setLoading(false)), [flash]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) flash(okMsg); await load(); return true; }
    catch (err) { flash(err.message, "error"); return false; }
    finally { setBusy(false); }
  };

  const create = async (e) => {
    e.preventDefault();
    const ok = await run(() => usersApi.create(form), `Created ${form.email}`);
    if (ok) { setForm({ email: "", password: "", role: "VIEWER" }); setShowCreate(false); }
  };

  const roleSelect = (value, onChange, disabled) => (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} style={{ ...input, width: "auto", padding: "6px 10px", fontSize: C.fontSizeSm, cursor: disabled ? "not-allowed" : "pointer" }}>
      {SYSADMIN_ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
    </select>
  );

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>
      <PageHeader
        title="Users"
        subtitle="Manage every account and its access, including the client's staff."
        action={!showCreate && <Btn onClick={() => setShowCreate(true)}><span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New User</Btn>}
      />
      <Feedback msg={fb.msg} type={fb.type} />

      {showCreate && (
        <Panel title="New User">
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, alignItems: "end" }}>
            <Field label="Email"><input style={input} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@example.com" /></Field>
            <Field label="Temporary password"><input style={input} type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="At least 8 characters" /></Field>
            <Field label="Role">{roleSelect(form.role, role => setForm(f => ({ ...f, role })), false)}</Field>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn type="submit" disabled={busy}>Create User</Btn>
              <Btn variant="ghost" onClick={() => { setShowCreate(false); setForm({ email: "", password: "", role: "VIEWER" }); }}>Cancel</Btn>
            </div>
          </form>
        </Panel>
      )}

      <Panel title={`All Users (${list.length})`} padded={false}>
        <Table head={["Email", "Role", "Created", "Actions"]} empty={!loading && list.length === 0 ? <Empty>No users.</Empty> : loading ? <Empty>Loading…</Empty> : null}>
          {list.map(u => {
            const self = u.id === currentAdminId;
            return (
              <tr key={u.id}>
                <Td style={{ fontWeight: 500 }}>
                  {u.email}{self && <span style={{ marginLeft: 8, fontSize: 10, color: C.textDim }}>(you)</span>}
                  <div style={{ marginTop: 5 }}><RoleBadge role={u.role} /></div>
                </Td>
                <Td>{self ? <span style={{ color: C.textDim, fontSize: C.fontSizeSm }}>Can't change your own role</span> : roleSelect(u.role, role => run(() => usersApi.changeRole(u.id, role), `${u.email} is now ${ROLE_LABELS[role]}`), busy)}</Td>
                <Td muted nowrap>{fmtDateTime(u.created_at)}</Td>
                <Td>
                  {self ? <span style={{ color: C.textDim, fontSize: C.fontSizeSm }}>Use Settings to change your password</span>
                  : resetId === u.id ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <input style={{ ...input, width: 170, padding: "6px 10px" }} type="password" placeholder="New temporary password" value={resetPass} onChange={e => setResetPass(e.target.value)} />
                      <Btn small disabled={busy || resetPass.length < 8} onClick={async () => { if (await run(() => usersApi.resetPassword(u.id, resetPass), `Password reset for ${u.email}`)) { setResetId(null); setResetPass(""); } }}>Save</Btn>
                      <Btn small variant="ghost" onClick={() => { setResetId(null); setResetPass(""); }}>Cancel</Btn>
                    </div>
                  ) : removeId === u.id ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ color: C.danger, fontSize: C.fontSizeSm, fontFamily: F.body }}>Remove {u.email}?</span>
                      <Btn small variant="danger" disabled={busy} onClick={async () => { if (await run(() => usersApi.remove(u.id), `${u.email} removed`)) setRemoveId(null); }}>Remove</Btn>
                      <Btn small variant="ghost" onClick={() => setRemoveId(null)}>Cancel</Btn>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Btn small variant="ghost" onClick={() => { setRemoveId(null); setResetId(u.id); }}>Reset Password</Btn>
                      <Btn small variant="danger" onClick={() => { setResetId(null); setRemoveId(u.id); }}>Remove</Btn>
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </div>
  );
}
