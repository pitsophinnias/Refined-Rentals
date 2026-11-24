/**
 * sysadmin/pages/SystemControls.jsx — maintenance mode.
 * While ON, the customer site shows a maintenance screen with the business's
 * phone numbers and email, and new website quote requests are turned away.
 * The admin dashboard keeps working, including manual requests.
 */

import { useEffect, useState } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { system as systemApi } from "../../api.js";
import { fmtDateTime } from "../constants.js";
import { PageHeader, Panel, Btn, Field, Feedback } from "../ui.jsx";
import { useInputStyle } from "../useInputStyle.js";

export default function SystemControls() {
  const { C, F } = useTheme();
  const input = useInputStyle();
  const [m, setM]             = useState(null);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [fb, setFb]           = useState({ msg: "", type: "success" });

  useEffect(() => {
    systemApi.controls()
      .then(d => { setM(d.maintenance); setMessage(d.maintenance.message); })
      .catch(err => setFb({ msg: err.message, type: "error" }));
  }, []);

  const save = async (enabled) => {
    setBusy(true);
    try {
      const d = await systemApi.setMaintenance(enabled, message);
      setM(d.maintenance); setMessage(d.maintenance.message); setConfirming(false);
      setFb({ msg: enabled ? (m?.enabled ? "Message updated." : "Maintenance mode is ON. Customers now see the maintenance screen.") : "Maintenance mode is OFF. The website is back to normal.", type: "success" });
    } catch (err) {
      setFb({ msg: err.message, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const on = m?.enabled;

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 820 }}>
      <PageHeader title="System Controls" subtitle="Switches that change how the live website behaves." />
      <Feedback msg={fb.msg} type={fb.type} />

      <Panel title="Maintenance Mode" right={m && (
        <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: F.body, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: on ? "rgba(232,160,32,0.15)" : "rgba(30,145,96,0.12)", color: on ? "#d4880a" : "#1e9160" }}>
          {on ? "On" : "Off"}
        </span>
      )}>
        <p style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textSecondary, fontWeight: 300, lineHeight: 1.7, margin: "0 0 1rem" }}>
          While it's on, the customer website shows a maintenance screen with your phone numbers and email instead of the normal site, and new quote requests from the website are turned away.
          The admin dashboard keeps working, so staff can still enter requests manually.
        </p>

        {m && (
          <>
            <Field label={`Message shown to visitors (${message.length}/300)`}>
              <textarea rows={3} maxLength={300} value={message} onChange={e => setMessage(e.target.value)} style={{ ...input, resize: "vertical", lineHeight: 1.6 }} />
            </Field>

            {m.updatedAt && (
              <div style={{ fontFamily: F.body, fontSize: C.fontSizeSm - 1, color: C.textDim, marginTop: 8 }}>
                Last changed {fmtDateTime(m.updatedAt)}{m.updatedBy ? ` by ${m.updatedBy}` : ""}
              </div>
            )}

            {confirming ? (
              <div style={{ background: "rgba(232,160,32,0.1)", border: "1px solid rgba(232,160,32,0.35)", borderRadius: 3, padding: "12px 14px", marginTop: "1rem" }}>
                <div style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: "#d4880a", fontWeight: 600, marginBottom: 10 }}>
                  Turn maintenance mode on? The website will immediately show the maintenance screen to every visitor.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn disabled={busy || !message.trim()} onClick={() => save(true)}>{busy ? "Turning on…" : "Yes, turn it on"}</Btn>
                  <Btn variant="ghost" onClick={() => setConfirming(false)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: "1rem", flexWrap: "wrap" }}>
                {on ? (
                  <>
                    <Btn disabled={busy} onClick={() => save(false)}>{busy ? "Turning off…" : "Turn off maintenance mode"}</Btn>
                    <Btn variant="ghost" disabled={busy || !message.trim() || message === m.message} onClick={() => save(true)}>Update message</Btn>
                  </>
                ) : (
                  <Btn variant="danger" disabled={!message.trim()} onClick={() => setConfirming(true)}>Turn on maintenance mode</Btn>
                )}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
