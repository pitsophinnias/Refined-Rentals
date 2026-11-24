/**
 * sysadmin/pages/Security.jsx — security at a glance and the controls to act
 * on it: checklist, server checks, session settings, login lockouts and
 * password health.
 */

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { system as systemApi } from "../../api.js";
import { fmtDateTime } from "../constants.js";
import { PageHeader, Panel, StatCard, Btn, Field, RoleBadge, Table, Td, Empty, Feedback } from "../ui.jsx";
import { useInputStyle } from "../useInputStyle.js";

const STATUS = {
  pass:    { label: "OK",        color: "#1e9160", bg: "rgba(30,145,96,0.12)" },
  warn:    { label: "Improve",   color: "#d4880a", bg: "rgba(232,160,32,0.14)" },
  fail:    { label: "Fix",       color: "#d94f4f", bg: "rgba(217,79,79,0.12)" },
  unknown: { label: "Can't tell", color: "#7a8ba8", bg: "rgba(138,151,176,0.14)" },
};

function Pill({ status }) {
  const { F } = useTheme();
  const s = STATUS[status] || STATUS.unknown;
  return <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: F.body, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function CheckList({ items }) {
  const { C, F } = useTheme();
  // Problems first, then unknowns, then passes
  const order = { fail: 0, warn: 1, unknown: 2, pass: 3 };
  const sorted = [...items].sort((a, b) => order[a.status] - order[b.status]);
  return sorted.map(c => (
    <div key={c.id} style={{ display: "grid", gridTemplateColumns: "86px 1fr", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}`, alignItems: "start" }}>
      <div style={{ paddingTop: 2 }}><Pill status={c.status} /></div>
      <div style={{ fontFamily: F.body, minWidth: 0 }}>
        <div style={{ fontSize: C.fontSize, color: C.textPrimary, fontWeight: 500 }}>{c.label}</div>
        <div style={{ fontSize: C.fontSizeSm, color: C.textSecondary, fontWeight: 300, marginTop: 3, lineHeight: 1.6 }}>{c.detail}</div>
        {c.fix && c.status !== "pass" && (
          <div style={{ fontSize: C.fontSizeSm - 1, color: C.textPrimary, marginTop: 6, padding: "7px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 2, lineHeight: 1.6, overflowWrap: "anywhere" }}>
            <span style={{ color: C.blue, fontWeight: 600 }}>How to fix: </span>{c.fix}
          </div>
        )}
      </div>
    </div>
  ));
}

const pwAge = (u) => (u.password_changed_at ? Math.floor((Date.now() - new Date(u.password_changed_at).getTime()) / 86400000) : null);

export default function Security({ currentAdminId }) {
  const { C, F } = useTheme();
  const input = useInputStyle();
  const [d, setD]         = useState(null);
  const [fb, setFb]       = useState({ msg: "", type: "success" });
  const [busy, setBusy]   = useState(null);
  const [session, setSession] = useState(null);

  const load = useCallback((fresh = false) => systemApi.security(fresh)
    .then(r => { setD(r); setSession({ maxHours: r.session.maxHours, idleMinutes: r.session.idleMinutes }); })
    .catch(err => setFb({ msg: err.message, type: "error" })), []);
  useEffect(() => { load(); }, [load]);

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    try { await fn(); setFb({ msg: okMsg, type: "success" }); await load(); }
    catch (err) { setFb({ msg: err.message, type: "error" }); }
    finally { setBusy(null); }
  };

  const all = d ? [...d.checklist, ...d.server.results] : [];
  const count = (s) => all.filter(c => c.status === s).length;
  const sessionChanged = d && session && (session.maxHours !== d.session.maxHours || session.idleMinutes !== d.session.idleMinutes);
  const selectStyle = { ...input, width: "auto", minWidth: 170, padding: "7px 10px" };

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>
      <PageHeader title="Security" subtitle="How well the site and server are protected, and the controls to tighten them." action={<Btn variant="ghost" disabled={busy === "refresh"} onClick={() => act("refresh", () => load(true), "Checks re-run.")}>{busy === "refresh" ? "Checking…" : "Run checks again"}</Btn>} />
      <Feedback msg={fb.msg} type={fb.type} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: "1.5rem" }}>
        <StatCard label="To fix" value={d ? count("fail") : null} accent={STATUS.fail.color} />
        <StatCard label="Could improve" value={d ? count("warn") : null} accent={STATUS.warn.color} />
        <StatCard label="OK" value={d ? count("pass") : null} accent={STATUS.pass.color} />
        <StatCard label="Couldn't check" value={d ? count("unknown") : null} accent={STATUS.unknown.color} />
      </div>

      <Panel title="Website and app">
        {d ? <CheckList items={d.checklist} /> : <Empty>Loading…</Empty>}
      </Panel>

      <Panel title="Server" right={d && <span style={{ fontFamily: F.body, fontSize: C.fontSizeSm - 1, color: C.textDim }}>Checked {fmtDateTime(d.server.checkedAt)}</span>}>
        {d ? <CheckList items={d.server.results} /> : <Empty>Loading…</Empty>}
      </Panel>

      <Panel title="Session Settings">
        {session && (
          <>
            <p style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textSecondary, fontWeight: 300, lineHeight: 1.6, margin: "0 0 14px" }}>
              Applies to everyone signing in to the admin dashboard. Changes take effect on each person's next click; nobody is signed out early except by the new limits.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
              <Field label="Sign everyone out after">
                <select value={session.maxHours} onChange={e => setSession(s => ({ ...s, maxHours: Number(e.target.value) }))} style={selectStyle}>
                  {d.session.maxHoursOptions.map(h => <option key={h} value={h}>{h < 24 ? `${h} hours` : `${h / 24} day${h === 24 ? "" : "s"}`}</option>)}
                </select>
              </Field>
              <Field label="…or after inactivity of">
                <select value={session.idleMinutes} onChange={e => setSession(s => ({ ...s, idleMinutes: Number(e.target.value) }))} style={selectStyle}>
                  {d.session.idleOptions.map(m => <option key={m} value={m}>{m === 0 ? "Never (off)" : m < 60 ? `${m} minutes` : `${m / 60} hour${m === 60 ? "" : "s"}`}</option>)}
                </select>
              </Field>
              <Btn disabled={!sessionChanged || busy === "session"} onClick={() => act("session", () => systemApi.setSession(session.maxHours, session.idleMinutes), "Session settings saved.")}>
                {busy === "session" ? "Saving…" : "Save"}
              </Btn>
            </div>
          </>
        )}
      </Panel>

      <Panel title="Login Lockouts" padded={false}>
        {d && (
          <div style={{ padding: "0.9rem 1.25rem 0", fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textSecondary, fontWeight: 300, lineHeight: 1.6 }}>
            Sign-in is blocked for {d.lockouts.windowMinutes} minutes after {d.lockouts.ipLimit} failed attempts from one IP address, or {d.lockouts.emailLimit} against one email. Unblock someone who locked themselves out here.
          </div>
        )}
        <Table head={["Blocked", "Failed attempts", "Last attempt", "Unblocks by itself", ""]} empty={d && d.lockouts.items.length === 0 ? <Empty>Nobody is blocked right now.</Empty> : null}>
          {(d?.lockouts.items || []).map(l => (
            <tr key={`${l.type}:${l.value}`}>
              <Td><span style={{ color: C.textDim, fontSize: C.fontSizeSm - 1, marginRight: 6 }}>{l.type === "ip" ? "IP" : "Email"}</span>{l.value}</Td>
              <Td nowrap style={{ color: C.danger, fontWeight: 600 }}>{l.failures}</Td>
              <Td muted nowrap>{fmtDateTime(l.lastFailure)}</Td>
              <Td muted nowrap>{fmtDateTime(l.blockedUntil)}</Td>
              <Td nowrap><Btn small variant="ghost" disabled={busy === l.value} onClick={() => act(l.value, () => systemApi.clearLockout(l.type, l.value), `Unblocked ${l.value}.`)}>Unblock</Btn></Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Password Health" padded={false}>
        <Table head={["User", "Password last changed", "Signed in on", "Must change", ""]} empty={d && d.users.length === 0 ? <Empty>No users.</Empty> : null}>
          {(d?.users || []).map(u => {
            const age = pwAge(u);
            const old = age == null || age > d.passwordMaxAgeDays;
            const self = u.id === currentAdminId;
            return (
              <tr key={u.id}>
                <Td style={{ fontWeight: 500 }}>
                  {u.email}{self && <span style={{ marginLeft: 8, fontSize: 10, color: C.textDim }}>(you)</span>}
                  <div style={{ marginTop: 5 }}><RoleBadge role={u.role} /></div>
                </Td>
                <Td nowrap style={{ color: old ? "#d4880a" : C.textPrimary }}>
                  {age == null ? "Not since tracking began" : age === 0 ? "Today" : `${age} day${age === 1 ? "" : "s"} ago`}
                </Td>
                <Td muted nowrap>{u.open_sessions} device{u.open_sessions === 1 ? "" : "s"}</Td>
                <Td nowrap>{u.must_change_password ? <span style={{ color: "#d4880a", fontSize: C.fontSizeSm }}>Yes, at next sign-in</span> : <span style={{ color: C.textDim, fontSize: C.fontSizeSm }}>No</span>}</Td>
                <Td nowrap>
                  {self ? <span style={{ color: C.textDim, fontSize: C.fontSizeSm }}>Use Settings</span>
                    : u.must_change_password
                      ? <Btn small variant="ghost" disabled={busy === `pw${u.id}`} onClick={() => act(`pw${u.id}`, () => systemApi.forcePasswordChange(u.id, false), `Cancelled for ${u.email}.`)}>Cancel</Btn>
                      : <Btn small variant="danger" disabled={busy === `pw${u.id}`} onClick={() => act(`pw${u.id}`, () => systemApi.forcePasswordChange(u.id, true), `${u.email} has been signed out and must choose a new password at next sign-in.`)}>Force password change</Btn>}
                </Td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </div>
  );
}
