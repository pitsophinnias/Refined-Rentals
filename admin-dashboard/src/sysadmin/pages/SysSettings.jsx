/**
 * sysadmin/pages/SysSettings.jsx — the System Admin's own account.
 */

import { useState } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { account as accountApi } from "../../api.js";
import { PageHeader, Panel, Btn, Field, Feedback, RoleBadge } from "../ui.jsx";
import { useInputStyle } from "../useInputStyle.js";

export default function SysSettings({ adminEmail }) {
  const { C, F } = useTheme();
  const input = useInputStyle();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [fb, setFb]     = useState({ msg: "", type: "success" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.next.length < 8) return setFb({ msg: "New password must be at least 8 characters.", type: "error" });
    if (form.next !== form.confirm) return setFb({ msg: "The new passwords don't match.", type: "error" });
    setBusy(true);
    try {
      await accountApi.changePassword(form.current, form.next);
      setFb({ msg: "Password changed.", type: "success" });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setFb({ msg: err.message, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 720 }}>
      <PageHeader title="Settings" subtitle="Your System Admin account." />

      <Panel title="Account">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontFamily: F.body, fontSize: C.fontSize, color: C.textPrimary }}>
          <span style={{ overflowWrap: "anywhere" }}>{adminEmail}</span>
          <RoleBadge role="SYSADMIN" />
        </div>
      </Panel>

      <Panel title="Change Password">
        <Feedback msg={fb.msg} type={fb.type} />
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Current password"><input style={input} type="password" autoComplete="current-password" required value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} /></Field>
          <Field label="New password"><input style={input} type="password" autoComplete="new-password" required value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} placeholder="At least 8 characters" /></Field>
          <Field label="Confirm new password"><input style={input} type="password" autoComplete="new-password" required value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} /></Field>
          <div><Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Change Password"}</Btn></div>
        </form>
      </Panel>
    </div>
  );
}
