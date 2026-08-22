/**
 * components/NewRequestModal.jsx
 *
 * Lets an admin create a request on behalf of a client who contacted via
 * WhatsApp or phone call, so every enquiry ends up centralised alongside
 * website submissions in the Quote Requests list.
 *
 * Services, duration options and tent size/config below are copied
 * directly from customer-site/src/App.jsx's QuoteModal so the two forms
 * stay in sync — if the customer site's list changes, update both.
 */

import { useState, useEffect } from "react";
import { useTheme } from "../ThemeProvider.jsx";
import { F } from "../tokens.js";
import { requests as requestsApi } from "../api.js";

const KNOWN_SERVICES = ["Frame Tents", "VIP Mobile Toilets", "Red Carpet", "Green Grass Carpet"];

const TENT_SIZES = [
  {
    id: "9x9",
    size: "9 x 9m",
    configs: [
      { id: "cinema", label: "Cinema / Chairs Only", capacity: "~120 guests" },
      { id: "tables", label: "With Round Tables",    capacity: "5 round tables" },
    ],
  },
  {
    id: "9x12",
    size: "9 x 12m",
    configs: [
      { id: "cinema", label: "Cinema / Chairs Only", capacity: "~200 guests" },
      { id: "tables", label: "With Round Tables",    capacity: "10 round tables" },
    ],
  },
  {
    id: "9x15",
    size: "9 x 15m",
    configs: [
      { id: "cinema", label: "Cinema / Chairs Only", capacity: "~250 guests" },
      { id: "tables", label: "With Round Tables",    capacity: "15 round tables" },
    ],
  },
];

const DURATIONS = [["single", "Single Day"], ["overnight", "Overnight"], ["multiple", "Multiple Days"]];

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function NewRequestModal({ onClose, onCreated }) {
  const { C, F } = useTheme();

  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    event: "", location: "",
    duration: "single",
    date: "", startDate: "", endDate: "",
    services: [],
    tentSize: "", tentConfig: "",
    message: "",
  });
  const [errors,     setErrors]     = useState({});
  const [hasAttempted, setHasAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const showTents = form.services.some(s => s.name === "Frame Tents");

  const toggleService = (name) => setForm(f => {
    const exists = f.services.find(x => x.name === name);
    const next   = exists
      ? f.services.filter(x => x.name !== name)
      : [...f.services, { name, qty: 1 }];
    return { ...f, services: next, ...(name === "Frame Tents" && exists ? { tentSize: "", tentConfig: "" } : {}) };
  });
  const updateQty = (name, qty) => setForm(f => ({
    ...f,
    services: f.services.map(x => x.name === name ? { ...x, qty: Math.max(1, Number(qty) || 1) } : x),
  }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim())  errs.name  = "Customer name is required.";
    if (!form.phone.trim()) errs.phone = "Phone number is required.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Enter a valid email address.";
    }
    if (!form.event.trim())    errs.event    = "Event name is required.";
    if (!form.location.trim()) errs.location = "Delivery address is required.";

    if (form.duration === "multiple") {
      if (!form.startDate) errs.startDate = "Start date is required.";
      if (!form.endDate)   errs.endDate   = "End date is required.";
      if (form.startDate && form.endDate && form.endDate < form.startDate) {
        errs.endDate = "End date can't be before the start date.";
      }
    } else if (!form.date) {
      errs.date = "Event date is required.";
    }

    if (form.services.length === 0) errs.services = "Select at least one service.";

    return errs;
  };

  // Once the user has attempted a submit, keep validation live so a field's
  // error clears the moment it's fixed — instead of only re-checking on the
  // next submit click.
  useEffect(() => {
    if (hasAttempted) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, hasAttempted]);

  const handleSubmit = async () => {
    setHasAttempted(true);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const data = await requestsApi.createManual({
        name:       form.name,
        phone:      form.phone,
        email:      form.email || undefined,
        event:      form.event,
        location:   form.location,
        duration:   form.duration,
        date:       form.date       || null,
        startDate:  form.startDate  || null,
        endDate:    form.endDate    || null,
        services:   form.services,
        tentSize:   form.tentSize   || null,
        tentConfig: form.tentConfig || null,
        message:    form.message    || null,
      });
      onCreated(data.request);
    } catch (err) {
      setSubmitError(
        err.message && err.message !== "Request failed: 500"
          ? err.message
          : "Something went wrong creating this request. Please try again."
      );
      setSubmitting(false);
    }
  };

  const iSm = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 2, padding: "11px 13px", color: C.textPrimary, fontSize: "0.87rem", fontFamily: F.body, fontWeight: 300, outline: "none", transition: "border-color 0.2s" };
  const errStyle = (key) => errors[key] ? { borderColor: C.danger } : {};
  const fi = e => { e.target.style.borderColor = C.blue; };
  const fo = (key) => e => { e.target.style.borderColor = errors[key] ? C.danger : C.border; };

  const Field = ({ label, error, children }) => (
    <div>
      <label style={{ display: "block", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, fontFamily: F.body, marginBottom: 6 }}>{label}</label>
      {children}
      {error && <div style={{ color: C.danger, fontSize: 11, fontFamily: F.body, marginTop: 5 }}>{error}</div>}
    </div>
  );

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(2,8,22,0.92)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto", animation: "rrnFadeIn 0.2s ease" }}
    >
      <div style={{ background: C.surfaceUp, border: `1px solid ${C.borderBlue}`, borderRadius: 3, width: "100%", maxWidth: 640, padding: "2rem", position: "relative", animation: "rrnSlideUp 0.25s cubic-bezier(.25,.46,.45,.94)", marginBottom: "1.5rem" }}>

        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: `1px solid ${C.border}`, borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: C.textDim, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        <div style={{ marginBottom: "1.75rem", paddingRight: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontFamily: F.body, fontWeight: 600, marginBottom: 6 }}>New Request</div>
          <h3 style={{ fontFamily: F.display, fontSize: "1.6rem", fontWeight: 500, color: C.textPrimary, margin: "0 0 0.25rem" }}>Log a Manual Request</h3>
          <p style={{ margin: 0, color: C.textSecondary, fontSize: "0.83rem", fontFamily: F.body, fontWeight: 300 }}>For clients who contacted via WhatsApp or phone call.</p>
        </div>

        {/* Read-only source note */}
        <div style={{ ...iSm, marginBottom: 14, color: C.textDim, fontStyle: "italic", cursor: "default", background: "rgba(255,255,255,0.02)" }}>
          Manual entry: WhatsApp / Call
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Contact */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Customer Name *" error={errors.name}>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name" onFocus={fi} onBlur={fo("name")} style={{ ...iSm, ...errStyle("name") }} />
            </Field>
            <Field label="Phone Number *" error={errors.phone}>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+266 …" onFocus={fi} onBlur={fo("phone")} style={{ ...iSm, ...errStyle("phone") }} />
            </Field>
          </div>

          <Field label="Email Address" error={errors.email}>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Optional" onFocus={fi} onBlur={fo("email")} style={{ ...iSm, ...errStyle("email") }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Event Name *" error={errors.event}>
              <input type="text" value={form.event} onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
                placeholder="e.g. Wedding" onFocus={fi} onBlur={fo("event")} style={{ ...iSm, ...errStyle("event") }} />
            </Field>
            <Field label="Delivery Address *" error={errors.location}>
              <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Maseru" onFocus={fi} onBlur={fo("location")} style={{ ...iSm, ...errStyle("location") }} />
            </Field>
          </div>

          {/* Duration */}
          <div>
            <div style={{ fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, fontFamily: F.body, marginBottom: 6 }}>Event Duration *</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
              {DURATIONS.map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, duration: val, date: "", startDate: "", endDate: "" }))}
                  style={{
                    background: form.duration === val ? C.blueDim : "rgba(255,255,255,0.02)",
                    border: `1px solid ${form.duration === val ? C.blue : C.border}`,
                    borderRadius: 2, padding: "9px 8px", cursor: "pointer",
                    color: form.duration === val ? C.textPrimary : C.textDim,
                    fontFamily: F.body, fontSize: "0.8rem", fontWeight: form.duration === val ? 600 : 300,
                    transition: "all 0.2s",
                  }}>{label}</button>
              ))}
            </div>
            {form.duration !== "multiple" ? (
              <Field label={form.duration === "overnight" ? "Event Date (collection next morning) *" : "Event Date *"} error={errors.date}>
                <input type="date" min={todayISO()} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  onFocus={fi} onBlur={fo("date")} style={{ ...iSm, ...errStyle("date") }} />
              </Field>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Start Date *" error={errors.startDate}>
                  <input type="date" min={todayISO()} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    onFocus={fi} onBlur={fo("startDate")} style={{ ...iSm, ...errStyle("startDate") }} />
                </Field>
                <Field label="End Date *" error={errors.endDate}>
                  <input type="date" min={form.startDate || todayISO()} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    onFocus={fi} onBlur={fo("endDate")} style={{ ...iSm, ...errStyle("endDate") }} />
                </Field>
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <div style={{ fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, fontFamily: F.body, marginBottom: 6 }}>Services Required *</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {KNOWN_SERVICES.map(s => {
                const activeItem = form.services.find(x => x.name === s);
                const active     = Boolean(activeItem);
                return (
                  <div key={s} style={{ border: `1px solid ${active ? C.blue : C.border}`, background: active ? C.blueDim : "transparent", borderRadius: 2, padding: "9px 11px", transition: "all 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div onClick={() => toggleService(s)} style={{ width: 14, height: 14, borderRadius: 1, border: `1.5px solid ${active ? C.blue : C.textDim}`, background: active ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                        {active && <span style={{ color: "white", fontSize: 9, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span onClick={() => toggleService(s)} style={{ flex: 1, color: active ? C.textPrimary : C.textSecondary, fontSize: "0.85rem", fontFamily: F.body, fontWeight: 300, cursor: "pointer" }}>{s}</span>
                      {active && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: C.textDim, fontFamily: F.body }}>Qty</span>
                          <input
                            type="number" min="1" max="99"
                            value={activeItem.qty}
                            onClick={e => e.stopPropagation()}
                            onChange={e => updateQty(s, e.target.value)}
                            style={{ width: 52, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.blue}`, borderRadius: 2, padding: "4px 6px", color: C.textPrimary, fontSize: "0.8rem", fontFamily: F.body, textAlign: "center", outline: "none" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.services && <div style={{ color: C.danger, fontSize: 11, fontFamily: F.body, marginTop: 6 }}>{errors.services}</div>}
          </div>

          {/* Tent size/config — same conditional behaviour as the customer site */}
          {showTents && (
            <div style={{ background: C.blueDim, border: `1px solid ${C.borderBlue}`, borderRadius: 2, padding: "14px" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.blue, marginBottom: 10, fontFamily: F.body, fontWeight: 600 }}>Tent Size and Configuration</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {TENT_SIZES.map(ts => (
                  <div key={ts.id} onClick={() => setForm(f => ({ ...f, tentSize: ts.id, tentConfig: "" }))}
                    style={{ border: `1px solid ${form.tentSize === ts.id ? C.blue : C.border}`, borderRadius: 2, padding: "10px 12px", background: form.tentSize === ts.id ? C.blueDim : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: form.tentSize === ts.id ? 10 : 0 }}>
                      <span style={{ fontFamily: F.display, fontSize: "1.05rem", fontWeight: 600, color: form.tentSize === ts.id ? C.textPrimary : C.textSecondary }}>{ts.size}</span>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${form.tentSize === ts.id ? C.blue : C.textDim}`, background: form.tentSize === ts.id ? C.blue : "transparent", flexShrink: 0 }} />
                    </div>
                    {form.tentSize === ts.id && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {ts.configs.map(cfg => (
                          <div key={cfg.id} onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, tentConfig: cfg.id })); }}
                            style={{ border: `1px solid ${form.tentConfig === cfg.id ? C.blue : C.border}`, background: form.tentConfig === cfg.id ? C.blueDim : "transparent", borderRadius: 2, padding: "8px 10px", cursor: "pointer", transition: "all 0.2s" }}>
                            <div style={{ fontFamily: F.body, fontSize: "0.8rem", fontWeight: 600, color: form.tentConfig === cfg.id ? C.textPrimary : C.textSecondary, marginBottom: 3 }}>{cfg.label}</div>
                            <div style={{ fontFamily: F.body, fontSize: 11, color: form.tentConfig === cfg.id ? C.blueLight : C.textDim }}>{cfg.capacity}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Field label="Special Instructions">
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={3} placeholder="Optional: anything the team should know" onFocus={fi} onBlur={fo("message")}
              style={{ ...iSm, resize: "vertical" }} />
          </Field>

          {submitError && (
            <div style={{ background: "rgba(217,79,79,0.1)", border: "1px solid rgba(217,79,79,0.25)", borderRadius: 2, padding: "9px 12px", color: C.danger, fontSize: "0.82rem", fontFamily: F.body, fontWeight: 300 }}>
              {submitError}
            </div>
          )}

          <button type="button" onClick={handleSubmit} disabled={submitting}
            style={{ marginTop: 4, background: submitting ? "rgba(33,150,196,0.45)" : C.blue, border: "none", borderRadius: 2, color: C.white, cursor: submitting ? "wait" : "pointer", padding: "13px", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, fontFamily: F.body, transition: "background 0.25s" }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = C.blueLight; }}
            onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = submitting ? "rgba(33,150,196,0.45)" : C.blue; }}
          >
            {submitting ? "Creating…" : "Create Request"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes rrnFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rrnSlideUp { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
