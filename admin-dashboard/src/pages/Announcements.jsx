/**
 * pages/Announcements.jsx
 * Active / Archive tabs. Create, remove (archive), restore with new dates.
 * Expiring within 24h shows a warning with Extend / Let Expire options.
 */

import { useState, useEffect, useRef } from "react";
import { useTheme } from "../ThemeProvider.jsx";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const EMPTY_FORM = {
  heading: "",
  content: "",
  image: null,
  startDate: "",
  endDate: "",
};

export default function Announcements() {
  const { C, F } = useTheme();
  const [tab, setTab]           = useState("active");   // "active" | "archive"
  const [items, setItems]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [restoreId, setRestoreId] = useState(null);     // id of archive item being restored
  const [restoreForm, setRestoreForm] = useState({ startDate: "", endDate: "" });
  const [extendId, setExtendId] = useState(null);       // id of expiring item being extended
  const [extendDate, setExtendDate] = useState("");
  const imgRef = useRef(null);

  /* Load */
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("rr_announcements") || "[]");
      // Auto-archive expired active items
      const now = Date.now();
      const updated = stored.map(a => {
        if (a.active && new Date(a.endDate).getTime() < now) return { ...a, active: false };
        return a;
      });
      setItems(updated);
      save(updated, false);
    } catch {}
  }, []);

  const save = (next, update = true) => {
    if (update) setItems(next);
    try { localStorage.setItem("rr_announcements", JSON.stringify(next)); } catch {}
  };

  /* Helpers */
  const now = Date.now();
  const active  = items.filter(a => a.active);
  const archive = items.filter(a => !a.active);

  const msUntilExpiry = (endDate) => new Date(endDate).getTime() - now;
  const isExpiringSoon = (a) => a.active && msUntilExpiry(a.endDate) < 24 * 3600 * 1000 && msUntilExpiry(a.endDate) > 0;

  const fmtCountdown = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
  };

  /* Create */
  const handleCreate = () => {
    if (!form.heading.trim() || !form.startDate || !form.endDate) {
      alert("Please fill in heading, start date, and end date.");
      return;
    }
    const newItem = {
      id: uid(),
      ...form,
      active: true,
      createdAt: new Date().toISOString(),
    };
    save([...items, newItem]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  /* Remove → archive */
  const removeItem = (id) => {
    save(items.map(a => a.id === id ? { ...a, active: false } : a));
  };

  /* Restore */
  const handleRestore = (id) => {
    if (!restoreForm.startDate || !restoreForm.endDate) {
      alert("Please set a new start and end date to restore.");
      return;
    }
    save(items.map(a => a.id === id ? { ...a, active: true, startDate: restoreForm.startDate, endDate: restoreForm.endDate } : a));
    setRestoreId(null);
    setRestoreForm({ startDate: "", endDate: "" });
    setTab("active");
  };

  /* Extend */
  const handleExtend = (id) => {
    if (!extendDate) { alert("Please pick a new end date."); return; }
    save(items.map(a => a.id === id ? { ...a, endDate: extendDate } : a));
    setExtendId(null);
    setExtendDate("");
  };

  /* Let expire */
  const handleLetExpire = (id) => {
    save(items.map(a => a.id === id ? { ...a, active: false } : a));
  };

  /* Image upload */
  const handleImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, image: e.target.result }));
    reader.readAsDataURL(file);
  };

  /* Styles */
  const iSm = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 2, padding: "10px 14px",
    color: C.textPrimary, fontSize: C.fontSize,
    fontFamily: F.body, outline: "none",
    transition: "border-color 0.2s",
    width: "100%", boxSizing: "border-box",
  };
  const fi = e => { e.target.style.borderColor = C.blue; };
  const fo = e => { e.target.style.borderColor = C.border; };

  /* Tab items */
  const displayed = tab === "active" ? active : archive;

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontFamily: F.body, marginBottom: 6 }}>Manage</div>
          <h1 style={{ fontFamily: F.display, fontSize: "2rem", fontWeight: 500, color: C.textPrimary, margin: 0 }}>Announcements</h1>
          <p style={{ color: C.textSecondary, fontSize: C.fontSize, fontFamily: F.body, fontWeight: 300, margin: "0.35rem 0 0" }}>
            Active announcements appear as a banner on the customer site.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ background: C.blue, border: "none", borderRadius: 2, color: "#fff", cursor: "pointer", padding: "10px 20px", fontSize: C.fontSize, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = C.blueLight}
          onMouseLeave={e => e.currentTarget.style.background = C.blue}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Announcement
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: C.surface, border: `1px solid ${C.borderBlue}`, borderRadius: 3, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: F.display, fontSize: "1.2rem", fontWeight: 600, color: C.textPrimary, marginBottom: "1.25rem" }}>New Announcement</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Heading *" value={form.heading} onChange={e => setForm(f => ({ ...f, heading: e.target.value }))} onFocus={fi} onBlur={fo} style={iSm} />
            <textarea placeholder="Content *" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} onFocus={fi} onBlur={fo} style={{ ...iSm, resize: "vertical" }} />

            {/* Image upload */}
            <div>
              <div style={{ fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body, marginBottom: 6 }}>Image (optional)</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => imgRef.current?.click()} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 2, padding: "8px 16px", cursor: "pointer", color: C.textSecondary, fontFamily: F.body, fontSize: C.fontSize, transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  {form.image ? "Change Image" : "Upload Image"}
                </button>
                {form.image && (
                  <>
                    <img src={form.image} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 2 }} />
                    <button onClick={() => setForm(f => ({ ...f, image: null }))} style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, fontSize: 13 }}>Remove</button>
                  </>
                )}
                <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleImage(e.target.files[0])} />
              </div>
            </div>

            {/* Date range */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body, marginBottom: 5 }}>Show from *</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} onFocus={fi} onBlur={fo} style={iSm} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body, marginBottom: 5 }}>Show until *</label>
                <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} onFocus={fi} onBlur={fo} style={iSm} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={handleCreate} style={{ background: C.blue, border: "none", borderRadius: 2, color: "#fff", cursor: "pointer", padding: "10px 24px", fontFamily: F.body, fontSize: C.fontSize, fontWeight: 600, transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.blueLight}
                onMouseLeave={e => e.currentTarget.style.background = C.blue}
              >Create</button>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 2, color: C.textSecondary, cursor: "pointer", padding: "10px 24px", fontFamily: F.body, fontSize: C.fontSize, transition: "border-color 0.2s" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: "1.5rem" }}>
        {[["active", "Active", active.length], ["archive", "Archive", archive.length]].map(([id, label, count]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: "none", border: "none", borderBottom: tab === id ? `2px solid ${C.blue}` : "2px solid transparent", cursor: "pointer", padding: "10px 20px", color: tab === id ? C.blue : C.textSecondary, fontFamily: F.body, fontSize: C.fontSize, fontWeight: tab === id ? 600 : 400, display: "flex", alignItems: "center", gap: 8, transition: "color 0.2s", marginBottom: -1 }}>
            {label}
            {count > 0 && <span style={{ background: tab === id ? C.blue : C.border, color: tab === id ? "#fff" : C.textDim, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{count}</span>}
          </button>
        ))}
      </div>

      {/* Items */}
      {displayed.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, padding: "3rem", textAlign: "center", color: C.textDim, fontFamily: F.body, fontSize: C.fontSize }}>
          {tab === "active" ? "No active announcements. Create one above." : "No archived announcements."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayed.map(item => {
            const expiring = isExpiringSoon(item);
            const ms = msUntilExpiry(item.endDate);

            return (
              <div key={item.id}>
                {/* Expiry warning */}
                {expiring && (
                  <div style={{ background: "rgba(232,160,32,0.1)", border: "1px solid rgba(232,160,32,0.3)", borderRadius: "2px 2px 0 0", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#e8a020", fontSize: 14 }}>⚠</span>
                      <span style={{ fontFamily: F.body, fontSize: C.fontSize, color: "#e8a020", fontWeight: 600 }}>
                        Expiring soon — {fmtCountdown(ms)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {extendId === item.id ? (
                        <>
                          <input type="date" value={extendDate} min={new Date().toISOString().split("T")[0]} onChange={e => setExtendDate(e.target.value)} onFocus={fi} onBlur={fo} style={{ ...iSm, width: "auto", padding: "6px 10px" }} />
                          <button onClick={() => handleExtend(item.id)} style={{ background: "#e8a020", border: "none", borderRadius: 2, color: "#fff", cursor: "pointer", padding: "6px 14px", fontFamily: F.body, fontSize: C.fontSizeSm, fontWeight: 600 }}>Confirm</button>
                          <button onClick={() => setExtendId(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 2, color: C.textSecondary, cursor: "pointer", padding: "6px 14px", fontFamily: F.body, fontSize: C.fontSizeSm }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setExtendId(item.id); setExtendDate(""); }} style={{ background: "#e8a020", border: "none", borderRadius: 2, color: "#fff", cursor: "pointer", padding: "6px 16px", fontFamily: F.body, fontSize: C.fontSizeSm, fontWeight: 600 }}>Extend</button>
                          <button onClick={() => handleLetExpire(item.id)} style={{ background: "none", border: "1px solid rgba(232,160,32,0.4)", borderRadius: 2, color: "#e8a020", cursor: "pointer", padding: "6px 16px", fontFamily: F.body, fontSize: C.fontSizeSm }}>Let Expire</button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Card */}
                <div style={{ background: C.surface, border: `1px solid ${expiring ? "rgba(232,160,32,0.3)" : C.border}`, borderRadius: expiring ? "0 0 2px 2px" : 2, padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    {item.image && <img src={item.image} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: F.display, fontSize: "1.05rem", fontWeight: 600, color: C.textPrimary }}>{item.heading}</span>
                        <span style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: F.body, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: item.active ? "rgba(30,145,96,0.1)" : C.border, color: item.active ? "#1e9160" : C.textDim }}>
                          {item.active ? "Active" : "Archived"}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 8px", color: C.textSecondary, fontSize: C.fontSize, fontFamily: F.body, fontWeight: 300, lineHeight: 1.6 }}>{item.content}</p>
                      <div style={{ fontSize: C.fontSizeSm, color: C.textDim, fontFamily: F.body }}>
                        {new Date(item.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {" — "}
                        {new Date(item.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {item.active ? (
                        <button onClick={() => removeItem(item.id)} style={{ background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.2)", borderRadius: 2, color: C.danger, cursor: "pointer", padding: "7px 14px", fontFamily: F.body, fontSize: C.fontSizeSm, fontWeight: 500, transition: "all 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(217,79,79,0.15)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(217,79,79,0.08)"}
                        >Remove</button>
                      ) : (
                        restoreId === item.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <div>
                                <div style={{ fontSize: C.fontSizeSm - 1, color: C.textDim, fontFamily: F.body, marginBottom: 3 }}>Start</div>
                                <input type="date" value={restoreForm.startDate} onChange={e => setRestoreForm(f => ({ ...f, startDate: e.target.value }))} onFocus={fi} onBlur={fo} style={{ ...iSm, width: 130, padding: "6px 10px" }} />
                              </div>
                              <div>
                                <div style={{ fontSize: C.fontSizeSm - 1, color: C.textDim, fontFamily: F.body, marginBottom: 3 }}>End</div>
                                <input type="date" value={restoreForm.endDate} min={restoreForm.startDate} onChange={e => setRestoreForm(f => ({ ...f, endDate: e.target.value }))} onFocus={fi} onBlur={fo} style={{ ...iSm, width: 130, padding: "6px 10px" }} />
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => handleRestore(item.id)} style={{ background: C.blue, border: "none", borderRadius: 2, color: "#fff", cursor: "pointer", padding: "6px 14px", fontFamily: F.body, fontSize: C.fontSizeSm, fontWeight: 600 }}>Restore</button>
                              <button onClick={() => setRestoreId(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 2, color: C.textSecondary, cursor: "pointer", padding: "6px 14px", fontFamily: F.body, fontSize: C.fontSizeSm }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setRestoreId(item.id); setRestoreForm({ startDate: "", endDate: "" }); }} style={{ background: C.blueDim, border: `1px solid ${C.borderBlue}`, borderRadius: 2, color: C.blue, cursor: "pointer", padding: "7px 14px", fontFamily: F.body, fontSize: C.fontSizeSm, fontWeight: 500, transition: "all 0.2s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(33,150,196,0.18)"}
                            onMouseLeave={e => e.currentTarget.style.background = C.blueDim}
                          >Restore</button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}