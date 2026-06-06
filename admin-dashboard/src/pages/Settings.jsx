/**
 * pages/Settings.jsx
 * Business settings — contact info, email config, notifications.
 * These are read-only display for now; editable when backend is live.
 */

import { useState } from "react";
import { C, F } from "../tokens.js";

function SettingRow({ label, value, hint }) {
  return (
    <div style={{ padding: "1rem 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 180 }}>
          <div style={{ fontFamily: F.body, fontSize: "0.88rem", fontWeight: 500, color: C.textPrimary, marginBottom: 2 }}>{label}</div>
          {hint && <div style={{ fontFamily: F.body, fontSize: 11, color: C.textDim, fontWeight: 300 }}>{hint}</div>}
        </div>
        <div style={{ fontFamily: F.body, fontSize: "0.88rem", color: C.textSecondary, fontWeight: 300 }}>{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, marginBottom: 18 }}>
      <div style={{ padding: "1.1rem 1.5rem", borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontFamily: F.display, fontSize: "1.1rem", fontWeight: 500, color: C.textPrimary, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: "0 1.5rem 0.5rem" }}>{children}</div>
    </div>
  );
}

export default function Settings() {
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifNew, setNotifNew]     = useState(true);

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 720 }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontFamily: F.body, marginBottom: 6 }}>Configuration</div>
        <h1 style={{ fontFamily: F.display, fontSize: "2rem", fontWeight: 500, color: C.textPrimary, margin: 0 }}>Settings</h1>
      </div>

      {/* Business info */}
      <Section title="Business Information">
        <SettingRow label="Business Name"    value="Refined Rentals (PTY) LTD" />
        <SettingRow label="Primary Phone"    value="+266 6363 0598" />
        <SettingRow label="Secondary Phone"  value="+266 5885 8114" />
        <SettingRow label="Email"            value="refinedrentals.lso@gmail.com" />
        <SettingRow label="Facebook"         value="Refined Rentals" />
        <SettingRow label="Coverage Area"    value="Lesotho-wide" />
      </Section>

      {/* Email config */}
      <Section title="Email Configuration">
        <SettingRow
          label="Quote Reply From Address"
          value="refinedrentals.lso@gmail.com"
          hint="Replies to customers are sent from this address"
        />
        <SettingRow
          label="Email Service"
          value="EmailJS (configured)"
          hint="Connect Resend or Nodemailer for production sending"
        />
        <div style={{ padding: "0.75rem 0" }}>
          <p style={{ margin: 0, fontSize: "0.82rem", color: C.textDim, fontFamily: F.body, fontWeight: 300, lineHeight: 1.65 }}>
            To update email configuration, connect a backend service (Supabase + Resend recommended). See the project README for setup instructions.
          </p>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        {[
          { label: "Email on new request", hint: "Receive an email when a new quote comes in", state: notifEmail, set: setNotifEmail },
          { label: "Alert for new status only", hint: "Only notify on NEW requests, not updates", state: notifNew, set: setNotifNew },
        ].map(item => (
          <div key={item.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "1rem 0", borderBottom: `1px solid ${C.border}`,
          }}>
            <div>
              <div style={{ fontFamily: F.body, fontSize: "0.88rem", fontWeight: 500, color: C.textPrimary, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.textDim, fontWeight: 300 }}>{item.hint}</div>
            </div>
            {/* Toggle */}
            <div
              onClick={() => item.set(s => !s)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: item.state ? C.blue : "rgba(255,255,255,0.1)",
                position: "relative", cursor: "pointer",
                transition: "background 0.25s", flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 3, left: item.state ? 21 : 3,
                width: 16, height: 16, borderRadius: "50%", background: C.white,
                transition: "left 0.25s",
              }}/>
            </div>
          </div>
        ))}
      </Section>

      {/* Backend status */}
      <Section title="Backend Status">
        <SettingRow label="Database"     value="⚠ Not connected — using demo data" hint="Connect Supabase to enable persistence" />
        <SettingRow label="Auth"         value="⚠ Demo mode — hardcoded credentials" hint="Enable Supabase Auth for production" />
        <SettingRow label="Email Sending" value="⚠ Simulated — no emails are sent yet" hint="Configure EmailJS or Resend" />
        <div style={{ padding: "0.75rem 0" }}>
          <p style={{ margin: 0, fontSize: "0.82rem", color: C.textDim, fontFamily: F.body, fontWeight: 300, lineHeight: 1.65 }}>
            This dashboard is currently running in demo mode. All data resets on refresh. Connect Supabase using the project README to enable full persistence.
          </p>
        </div>
      </Section>
    </div>
  );
}