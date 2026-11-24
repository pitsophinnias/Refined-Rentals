/**
 * components/ForcePasswordChange.jsx
 * Shown instead of the dashboard when the account must change its password:
 * a new account, an admin reset, or a System Admin forcing it from the
 * Security page. The server allows nothing else until it's done.
 */

import { useState } from "react";
import { useTheme } from "../ThemeProvider.jsx";
import { account as accountApi } from "../api.js";

export default function ForcePasswordChange({ email, onDone, onSignOut }) {
  const { C, F } = useTheme();
  const [form, setForm]   = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy]   = useState(false);

  const input = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 2, padding: "10px 12px", color: C.textPrimary, fontFamily: F.body, fontSize: C.fontSize, outline: "none", width: "100%", boxSizing: "border-box" };
  const label = { fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, fontFamily: F.body, display: "block", marginBottom: 6 };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 8) return setError("The new password must be at least 8 characters.");
    if (form.next !== form.confirm) return setError("The new passwords don't match.");
    if (form.next === form.current) return setError("Choose a password different from the temporary one.");
    setBusy(true);
    try {
      await accountApi.changePassword(form.current, form.next);
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", boxSizing: "border-box" }}>
      <form onSubmit={submit} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, padding: "2rem", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontFamily: F.body, marginBottom: 8 }}>Refined Rentals</div>
          <h1 style={{ fontFamily: F.display, fontSize: "1.7rem", fontWeight: 500, color: C.textPrimary, margin: "0 0 8px" }}>Choose a new password</h1>
          <p style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textSecondary, fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
            The password for <strong style={{ color: C.textPrimary, fontWeight: 500 }}>{email}</strong> was set by someone else, so please pick your own before continuing.
          </p>
        </div>
        {error && <div role="alert" style={{ background: "rgba(217,79,79,0.1)", border: "1px solid rgba(217,79,79,0.3)", color: C.danger, borderRadius: 2, padding: "9px 12px", fontFamily: F.body, fontSize: C.fontSizeSm }}>{error}</div>}
        <label><span style={label}>Current (temporary) password</span><input style={input} type="password" autoComplete="current-password" required value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} /></label>
        <label><span style={label}>New password</span><input style={input} type="password" autoComplete="new-password" required value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} placeholder="At least 8 characters" /></label>
        <label><span style={label}>Confirm new password</span><input style={input} type="password" autoComplete="new-password" required value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} /></label>
        <button type="submit" disabled={busy} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 2, padding: "11px 18px", fontFamily: F.body, fontSize: C.fontSize, fontWeight: 600, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Saving…" : "Save and continue"}
        </button>
        <button type="button" onClick={onSignOut} style={{ background: "none", border: "none", color: C.textSecondary, fontFamily: F.body, fontSize: C.fontSizeSm, cursor: "pointer" }}>Sign out</button>
      </form>
    </div>
  );
}
