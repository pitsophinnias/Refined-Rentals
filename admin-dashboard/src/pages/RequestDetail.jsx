/**
 * pages/RequestDetail.jsx
 *
 * Status flow:
 *   NEW → open reply modal → immediately becomes REVIEW
 *   REVIEW → fill quote, generate PDF, respond → QUOTED (quoted_at saved)
 *   QUOTED → 7-day countdown → prompt accept/reject OR admin closes early
 *   CLOSED → shows reason (ACCEPTED / REJECTED) + closure note
 *
 * Quote viewer: when QUOTED or CLOSED, shows saved line items + message sent.
 * PDF can be re-downloaded (requires regenerating since blob URLs are session-only).
 */

import { useState, useEffect } from "react";
import { C, F, fmtDate, timeAgo } from "../tokens.js";
import StatusBadge from "../components/StatusBadge.jsx";
import ReplyModal  from "../components/ReplyModal.jsx";

const STATUS_FLOW = ["NEW", "REVIEW", "QUOTED", "CLOSED"];

/* ── helpers ── */
const currency = (n) =>
  `M ${Number(n||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,",")}`;

function useCountdown(isoStart) {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!isoStart) return;
    const expiry = new Date(isoStart).getTime() + SEVEN_DAYS;
    const tick = () => {
      const diff = expiry - Date.now();
      setRemaining(Math.max(0, diff));
    };
    tick();
    const iv = setInterval(tick, 60000); // update every minute
    return () => clearInterval(iv);
  }, [isoStart]);

  if (remaining === null) return null;
  const days  = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const mins  = Math.floor((remaining % 3600000) / 60000);
  return { remaining, days, hours, mins, expired: remaining === 0 };
}

/* ── InfoRow ── */
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display:"flex", gap:16, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:110, flexShrink:0, fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase", color:C.textDim, fontFamily:F.body, paddingTop:1 }}>{label}</div>
      <div style={{ color:C.textSecondary, fontSize:"0.88rem", fontFamily:F.body, fontWeight:300, flex:1 }}>{value}</div>
    </div>
  );
}

/* ── CloseModal — accept / reject closure ── */
function CloseModal({ request, onClose, onConfirm }) {
  const [reason,  setReason]  = useState(""); // "ACCEPTED" | "REJECTED"
  const [note,    setNote]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const overlayRef = useRef(null);

  function useRef(init) { return useState(init)[1], { current: null }; }
  // simple approach — use a wrapper div ref via callback
  const [overlayEl, setOverlayEl] = useState(null);

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  const handleConfirm = () => {
    if (!reason) return;
    setSaving(true);
    setTimeout(() => { setSaving(false); onConfirm(reason, note); }, 500);
  };

  return (
    <div onClick={e=>{ if(e.target===overlayEl) onClose(); }} ref={el=>setOverlayEl(el)}
      style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(2,8,22,0.9)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", animation:"cmFadeIn 0.2s ease" }}>
      <div style={{ background:C.surfaceUp, border:`1px solid ${C.borderBlue}`, borderRadius:3, width:"100%", maxWidth:480, padding:"2rem", position:"relative", animation:"cmSlideUp 0.22s ease" }}>
        <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"none", border:`1px solid ${C.border}`, borderRadius:"50%", width:28, height:28, cursor:"pointer", color:C.textDim, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>

        <div style={{ fontSize:9, letterSpacing:"0.22em", textTransform:"uppercase", color:C.blue, fontFamily:F.body, fontWeight:600, marginBottom:8 }}>Close Request</div>
        <h3 style={{ fontFamily:F.display, fontSize:"1.4rem", fontWeight:500, color:C.textPrimary, margin:"0 0 0.5rem" }}>How did the quote end?</h3>
        <p style={{ color:C.textSecondary, fontSize:"0.83rem", fontFamily:F.body, fontWeight:300, margin:"0 0 1.5rem", lineHeight:1.65 }}>
          Closing this request will mark it as done. Select the outcome below.
        </p>

        {/* outcome buttons */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:"1.25rem" }}>
          {[
            { id:"ACCEPTED", label:"Accepted", desc:"Client confirmed the quote", color:"#27a86e", bg:"rgba(39,168,110,0.1)", border:"rgba(39,168,110,0.35)" },
            { id:"REJECTED", label:"Rejected",  desc:"Client did not proceed",   color:C.danger,  bg:"rgba(217,79,79,0.08)", border:"rgba(217,79,79,0.3)" },
          ].map(o=>(
            <button key={o.id} onClick={()=>setReason(o.id)} style={{ background:reason===o.id?o.bg:"rgba(255,255,255,0.03)", border:`1px solid ${reason===o.id?o.border:C.border}`, borderRadius:2, padding:"14px 12px", cursor:"pointer", textAlign:"left", transition:"all 0.2s" }}>
              <div style={{ fontFamily:F.body, fontWeight:600, fontSize:"0.9rem", color:reason===o.id?o.color:C.textPrimary, marginBottom:4 }}>{o.label}</div>
              <div style={{ fontFamily:F.body, fontSize:11, color:C.textDim, fontWeight:300 }}>{o.desc}</div>
            </button>
          ))}
        </div>

        {/* optional note */}
        <div style={{ marginBottom:"1.25rem" }}>
          <label style={{ display:"block", fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:C.textDim, fontFamily:F.body, marginBottom:6 }}>Closure Note (optional)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="e.g. Deposit received. Confirmed for 19 July."
            style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:2, padding:"10px 12px", color:C.textPrimary, fontSize:"0.85rem", fontFamily:F.body, fontWeight:300, outline:"none", resize:"vertical", lineHeight:1.6 }}
            onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}
          />
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
          <button onClick={onClose} style={{ background:"none", border:`1px solid ${C.border}`, color:C.textSecondary, cursor:"pointer", padding:"10px 20px", borderRadius:2, fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:600, fontFamily:F.body }}>Cancel</button>
          <button onClick={handleConfirm} disabled={!reason||saving} style={{ background:!reason?C.border:reason==="ACCEPTED"?"#27a86e":C.danger, border:"none", color:C.white, cursor:!reason?"not-allowed":"pointer", padding:"10px 24px", borderRadius:2, fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:600, fontFamily:F.body, transition:"background 0.2s" }}>
            {saving?"Closing…":"Confirm & Close"}
          </button>
        </div>
      </div>
      <style>{`@keyframes cmFadeIn{from{opacity:0}to{opacity:1}} @keyframes cmSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════ */
import { useRef } from "react";

export default function RequestDetail({ request, onBack, onUpdate }) {
  const [showReply, setShowReply]     = useState(false);
  const [showClose, setShowClose]     = useState(false);
  const [notes,     setNotes]         = useState(request.notes ?? "");
  const [notesSaved,setNotesSaved]    = useState(false);
  const [showExpiredPrompt, setShowExpiredPrompt] = useState(false);

  const countdown = useCountdown(request.quoted_at);

  // Show expired prompt once when timer hits 0
  useEffect(() => {
    if (countdown?.expired && request.status === "QUOTED" && !showClose) {
      setShowExpiredPrompt(true);
    }
  }, [countdown?.expired]);

  if (!request) return null;

  const handleStatusChange = (s) => onUpdate({ ...request, status: s });

  /* Called when admin opens the modal — set to REVIEW */
  const handleOpenModal = () => {
    if (request.status === "NEW") onUpdate({ ...request, status: "REVIEW" });
    setShowReply(true);
  };

  /* Called from ReplyModal when status should change (NEW→REVIEW on open) */
  const handleStatusFromModal = (s) => {
    onUpdate({ ...request, status: s });
  };

  /* Called when quote is fully sent */
  const handleQuoteSent = (quoteData, pdfUrl) => {
    setShowReply(false);
    const summary =
      `Quote sent via ${quoteData.channel === "email" ? "Email" : "WhatsApp"} on ${fmtDate(new Date().toISOString())}\n\n` +
      quoteData.items.filter(i=>i.description.trim())
        .map(i=>`• ${i.description}: ${currency((Number(i.qty)||1)*(Number(i.unitPrice)||0))}`)
        .join("\n") +
      `\n\nTotal: ${currency(quoteData.grandTotal)}` +
      (quoteData.note ? `\n\nNote: ${quoteData.note}` : "");

    onUpdate({
      ...request,
      status:       "QUOTED",
      quoted_at:    new Date().toISOString(),
      quote_data:   quoteData,
      quote_pdf_url: pdfUrl,
      reply_text:   summary,
      replied_at:   new Date().toISOString(),
    });
  };

  /* Closure */
  const handleClose = (reason, note) => {
    setShowClose(false);
    setShowExpiredPrompt(false);
    onUpdate({ ...request, status: "CLOSED", closed_reason: reason, closed_note: note || "" });
  };

  const saveNotes = () => {
    onUpdate({ ...request, notes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  /* ── Derived ── */
  const isQuoted = request.status === "QUOTED";
  const isClosed = request.status === "CLOSED";
  const hasQuote = Boolean(request.quote_data);

  return (
    <div style={{ padding:"2rem 2.5rem", maxWidth:920 }}>

      {/* expired timer prompt banner */}
      {showExpiredPrompt && (
        <div style={{ marginBottom:"1.5rem", background:"rgba(232,160,32,0.1)", border:"1px solid rgba(232,160,32,0.35)", borderRadius:3, padding:"1rem 1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⏰</span>
            <div>
              <div style={{ fontFamily:F.body, fontWeight:600, fontSize:"0.9rem", color:"#e8a020", marginBottom:2 }}>Quote validity has expired</div>
              <div style={{ fontFamily:F.body, fontSize:11, color:C.textDim, fontWeight:300 }}>The 7-day quote window has ended. Did the client accept or reject?</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>{setShowExpiredPrompt(false); setShowClose(true);}} style={{ background:"#e8a020", border:"none", color:C.white, cursor:"pointer", padding:"9px 18px", borderRadius:2, fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:600, fontFamily:F.body }}>
              Close Request
            </button>
            <button onClick={()=>setShowExpiredPrompt(false)} style={{ background:"none", border:`1px solid ${C.border}`, color:C.textDim, cursor:"pointer", padding:"9px 14px", borderRadius:2, fontSize:11, fontFamily:F.body }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* back */}
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:7, background:"none", border:"none", cursor:"pointer", color:C.textDim, fontSize:12, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:F.body, fontWeight:500, padding:0, marginBottom:"1.75rem", transition:"color 0.2s" }}
        onMouseEnter={e=>e.currentTarget.style.color=C.blue}
        onMouseLeave={e=>e.currentTarget.style.color=C.textDim}
      >← Back to Requests</button>

      {/* page header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap", marginBottom:"1.75rem" }}>
        <div>
          <div style={{ fontSize:9.5, letterSpacing:"0.22em", textTransform:"uppercase", color:C.blue, fontFamily:F.body, marginBottom:6 }}>
            {request.id} · Received {timeAgo(request.submitted_at)}
          </div>
          <h1 style={{ fontFamily:F.display, fontSize:"1.9rem", fontWeight:500, color:C.textPrimary, margin:"0 0 0.5rem" }}>{request.name}</h1>
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <StatusBadge status={request.status} />
            <span style={{ color:C.textDim, fontSize:12, fontFamily:F.body }}>{request.event} · {fmtDate(request.date)}</span>
            {/* 7-day countdown badge */}
            {isQuoted && countdown && !countdown.expired && (
              <span style={{ background:"rgba(232,160,32,0.12)", border:"1px solid rgba(232,160,32,0.3)", color:"#e8a020", padding:"3px 10px", borderRadius:2, fontSize:10, fontFamily:F.body, fontWeight:600, letterSpacing:"0.12em" }}>
                ⏱ {countdown.days}d {countdown.hours}h {countdown.mins}m remaining
              </span>
            )}
            {isQuoted && countdown?.expired && (
              <span style={{ background:"rgba(217,79,79,0.12)", border:"1px solid rgba(217,79,79,0.3)", color:C.danger, padding:"3px 10px", borderRadius:2, fontSize:10, fontFamily:F.body, fontWeight:600, letterSpacing:"0.12em" }}>
                ⏰ Quote expired
              </span>
            )}
          </div>
        </div>

        {/* action buttons */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {/* QUOTE REPLY button */}
          {!isClosed && (
            <button onClick={handleOpenModal} style={{ background:C.blue, border:"none", color:C.white, cursor:"pointer", padding:"10px 22px", borderRadius:2, fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:600, fontFamily:F.body, transition:"background 0.25s", display:"flex", alignItems:"center", gap:7 }}
              onMouseEnter={e=>e.currentTarget.style.background=C.blueLight}
              onMouseLeave={e=>e.currentTarget.style.background=C.blue}
            >
              <SendIcon/>
              {hasQuote ? "Revise Quote" : "Build & Send Quote"}
            </button>
          )}
          {/* CLOSE button */}
          {(isQuoted || request.status === "REVIEW") && (
            <button onClick={()=>setShowClose(true)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textSecondary, cursor:"pointer", padding:"10px 18px", borderRadius:2, fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:600, fontFamily:F.body, transition:"all 0.2s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.danger; e.currentTarget.style.color=C.danger; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.textSecondary; }}
            >Close Request</button>
          )}
        </div>
      </div>

      {/* two-column layout */}
      <div style={{ display:"grid", gridTemplateColumns:"1.1fr 0.9fr", gap:18, alignItems:"start" }} className="rr-detail-grid">

        {/* LEFT column */}
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

          {/* Client info */}
          <Card title="Client Information">
            <InfoRow label="Name"  value={request.name} />
            <InfoRow label="Email" value={request.email} />
            <InfoRow label="Phone" value={request.phone} />
          </Card>

          {/* Event details */}
          <Card title="Event Details">
            <InfoRow label="Type"     value={request.event} />
            <InfoRow label="Date"     value={fmtDate(request.date)} />
            <InfoRow label="Location" value={request.location} />
          </Card>

          {/* Services */}
          <Card title="Services Requested">
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom: request.other ? "1rem" : 0 }}>
              {request.services.map(s=>(
                <span key={s} style={{ background:C.blueDim, border:`1px solid ${C.borderBlue}`, color:C.blue, padding:"5px 12px", borderRadius:2, fontSize:11, fontFamily:F.body, fontWeight:500, letterSpacing:"0.08em" }}>{s}</span>
              ))}
            </div>
            {request.other && (
              <div style={{ marginTop:"0.75rem", background:"rgba(232,160,32,0.07)", border:"1px solid rgba(232,160,32,0.2)", borderRadius:2, padding:"10px 12px" }}>
                <div style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color:"#e8a020", fontFamily:F.body, fontWeight:600, marginBottom:4 }}>Custom Request</div>
                <p style={{ margin:0, color:C.textSecondary, fontSize:"0.85rem", fontFamily:F.body, fontWeight:300, lineHeight:1.65 }}>{request.other}</p>
              </div>
            )}
          </Card>

          {/* Customer message */}
          {request.message && (
            <Card title="Message from Customer">
              <p style={{ margin:0, color:C.textSecondary, fontSize:"0.88rem", fontFamily:F.body, fontWeight:300, lineHeight:1.75, fontStyle:"italic" }}>"{request.message}"</p>
            </Card>
          )}

          {/* ── QUOTE VIEWER ── visible when QUOTED or CLOSED and quote_data exists */}
          {hasQuote && (isQuoted || isClosed) && (
            <Card title="Quote Sent">
              {/* line items table */}
              <div style={{ marginBottom:"0.75rem" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 48px 80px 80px", gap:6, padding:"5px 0", borderBottom:`1px solid ${C.border}`, marginBottom:4 }}>
                  {["Item","Qty","Unit","Total"].map(h=>(
                    <div key={h} style={{ fontSize:8.5, letterSpacing:"0.16em", textTransform:"uppercase", color:C.textDim, fontFamily:F.body }}>{h}</div>
                  ))}
                </div>
                {request.quote_data.items.filter(i=>i.description.trim()&&!i._declined).map((item,idx)=>{
                  const total = (Number(item.qty)||1)*(Number(item.unitPrice)||0);
                  return (
                    <div key={item.id||idx} style={{ display:"grid", gridTemplateColumns:"1fr 48px 80px 80px", gap:6, padding:"6px 0", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
                      <div style={{ fontFamily:F.body, fontSize:"0.83rem", color:C.textPrimary }}>
                        {item.description}
                        {item._isOther&&<span style={{ marginLeft:6, fontSize:8.5, color:"#27a86e", background:"rgba(39,168,110,0.1)", padding:"1px 5px", borderRadius:2 }}>Custom</span>}
                      </div>
                      <div style={{ fontFamily:F.body, fontSize:"0.83rem", color:C.textDim, textAlign:"center" }}>{item.qty||1}</div>
                      <div style={{ fontFamily:F.body, fontSize:"0.83rem", color:C.textDim }}>{currency(item.unitPrice)}</div>
                      <div style={{ fontFamily:F.body, fontSize:"0.83rem", color:C.textPrimary, fontWeight:500 }}>{currency(total)}</div>
                    </div>
                  );
                })}
                {/* declined items if any */}
                {request.quote_data.declinedItems?.length > 0 && (
                  <div style={{ marginTop:8, background:"rgba(232,160,32,0.07)", border:"1px solid rgba(232,160,32,0.2)", borderRadius:2, padding:"8px 10px" }}>
                    <div style={{ fontSize:8.5, letterSpacing:"0.16em", textTransform:"uppercase", color:"#e8a020", fontFamily:F.body, marginBottom:5 }}>Items Not Provided</div>
                    {request.quote_data.declinedItems.map((d,i)=>(
                      <div key={i} style={{ marginBottom:4 }}>
                        <span style={{ color:C.textSecondary, fontSize:"0.83rem", fontFamily:F.body }}>{d.description}</span>
                        <span style={{ color:C.textDim, fontSize:11, fontFamily:F.body }}> — {d.declineReason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* total */}
              <div style={{ display:"flex", justifyContent:"flex-end", padding:"8px 0", borderTop:`1px solid ${C.border}`, marginBottom:"0.9rem" }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, letterSpacing:"0.16em", textTransform:"uppercase", color:C.textDim, fontFamily:F.body, marginBottom:3 }}>Total</div>
                  <div style={{ fontFamily:F.display, fontSize:"1.35rem", fontWeight:600, color:C.blue }}>{currency(request.quote_data.grandTotal)}</div>
                </div>
              </div>

              {/* message sent */}
              <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${C.border}`, borderRadius:2, padding:"10px 12px", marginBottom:"0.75rem" }}>
                <div style={{ fontSize:8.5, letterSpacing:"0.16em", textTransform:"uppercase", color:C.textDim, fontFamily:F.body, marginBottom:6 }}>
                  Message Sent via {request.quote_data.channel === "email" ? "Email" : "WhatsApp"}
                </div>
                <pre style={{ margin:0, color:C.textSecondary, fontSize:"0.78rem", fontFamily:F.body, fontWeight:300, lineHeight:1.7, whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:160, overflowY:"auto" }}>
                  {request.quote_data.message}
                </pre>
              </div>

              {/* PDF note */}
              <div style={{ display:"flex", alignItems:"center", gap:8, color:C.textDim, fontSize:11, fontFamily:F.body }}>
                <svg viewBox="0 0 16 16" fill="none" style={{width:13,height:13}}><rect x="2" y="1" width="10" height="13" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                PDF can be regenerated by opening "Revise Quote" and re-generating without changes.
              </div>
            </Card>
          )}

          {/* Closure info */}
          {isClosed && (
            <Card title="Closure">
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:9.5, letterSpacing:"0.18em", textTransform:"uppercase", color:C.textDim, fontFamily:F.body, width:110, flexShrink:0 }}>Outcome</div>
                <span style={{
                  background: request.closed_reason==="ACCEPTED"?"rgba(39,168,110,0.12)":"rgba(217,79,79,0.12)",
                  color:       request.closed_reason==="ACCEPTED"?"#27a86e":C.danger,
                  padding:"4px 12px", borderRadius:2, fontSize:11,
                  fontFamily:F.body, fontWeight:600, letterSpacing:"0.14em",
                }}>{request.closed_reason==="ACCEPTED"?"✓ Accepted":"✕ Rejected"}</span>
              </div>
              {request.closed_note && <InfoRow label="Note" value={request.closed_note} />}
            </Card>
          )}
        </div>

        {/* RIGHT column */}
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

          {/* Status control */}
          <Card title="Status">
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {STATUS_FLOW.map(s=>{
                const active = request.status === s;
                const idx    = STATUS_FLOW.indexOf(s);
                const cur    = STATUS_FLOW.indexOf(request.status);
                const past   = idx < cur;
                return (
                  <button key={s} onClick={()=>handleStatusChange(s)} style={{ display:"flex", alignItems:"center", gap:10, background:active?C.blueDim:"transparent", border:`1px solid ${active?C.borderBlue:C.border}`, borderRadius:2, padding:"10px 14px", cursor:"pointer", textAlign:"left", width:"100%", transition:"all 0.2s" }}
                    onMouseEnter={e=>{ if(!active){e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";} }}
                    onMouseLeave={e=>{ if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=C.border;} }}
                  >
                    <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:active?C.blue:past?"rgba(39,168,110,0.6)":C.border }}/>
                    <span style={{ fontFamily:F.body, fontSize:"0.85rem", color:active?C.blue:past?"rgba(255,255,255,0.4)":C.textSecondary, fontWeight:active?600:400 }}>
                      {s==="REVIEW"?"In Review":s.charAt(0)+s.slice(1).toLowerCase()}
                    </span>
                    {active&&<span style={{ marginLeft:"auto", fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:C.blue, fontFamily:F.body, fontWeight:600 }}>Current</span>}
                  </button>
                );
              })}
            </div>

            {/* close early shortcut when quoted */}
            {isQuoted && (
              <button onClick={()=>setShowClose(true)} style={{ marginTop:10, width:"100%", background:"none", border:`1px dashed ${C.border}`, color:C.textDim, cursor:"pointer", padding:"9px", borderRadius:2, fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:F.body, fontWeight:500, transition:"all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.danger;e.currentTarget.style.color=C.danger;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textDim;}}
              >Close early — accept or reject</button>
            )}
          </Card>

          {/* Internal notes */}
          <Card title="Internal Notes">
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={5}
              placeholder="Add private notes (not visible to client)…"
              style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:2, padding:"10px 12px", color:C.textPrimary, fontSize:"0.85rem", fontFamily:F.body, fontWeight:300, resize:"vertical", outline:"none", transition:"border-color 0.25s", lineHeight:1.65 }}
              onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}
            />
            <button onClick={saveNotes} style={{ marginTop:8, background:"none", border:`1px solid ${notesSaved?"rgba(39,168,110,0.4)":C.border}`, color:notesSaved?"#27a86e":C.textSecondary, borderColor:notesSaved?"rgba(39,168,110,0.4)":C.border, cursor:"pointer", padding:"7px 16px", borderRadius:2, fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:600, fontFamily:F.body, transition:"all 0.2s" }}>
              {notesSaved?"✓ Saved":"Save Notes"}
            </button>
          </Card>

          {/* Quote history summary */}
          {request.reply_text && (
            <Card title={`Quote History · ${fmtDate(request.replied_at)}`}>
              <pre style={{ margin:0, color:C.textSecondary, fontSize:"0.79rem", fontFamily:F.body, fontWeight:300, lineHeight:1.7, whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:220, overflowY:"auto" }}>
                {request.reply_text}
              </pre>
            </Card>
          )}
        </div>
      </div>

      {/* Quote builder modal */}
      {showReply && (
        <ReplyModal
          request={request}
          onClose={()=>setShowReply(false)}
          onQuoteSent={handleQuoteSent}
          onStatusChange={handleStatusFromModal}
        />
      )}

      {/* Close modal */}
      {(showClose || showExpiredPrompt && false) && (
        <CloseModal
          request={request}
          onClose={()=>setShowClose(false)}
          onConfirm={handleClose}
        />
      )}

      <style>{`
        @media(max-width:820px){.rr-detail-grid{grid-template-columns:1fr!important}}
      `}</style>
    </div>
  );
}

/* ── Card wrapper ── */
function Card({ title, children }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:3 }}>
      <div style={{ padding:"1rem 1.5rem", borderBottom:`1px solid ${C.border}` }}>
        <span style={{ fontSize:9.5, letterSpacing:"0.2em", textTransform:"uppercase", color:C.textDim, fontFamily:F.body }}>{title}</span>
      </div>
      <div style={{ padding:"1rem 1.5rem" }}>{children}</div>
    </div>
  );
}

function SendIcon() { return <svg viewBox="0 0 16 16" fill="none" style={{width:14,height:14}}><path d="M2 8l12-6-6 12-2-4-4-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>; }