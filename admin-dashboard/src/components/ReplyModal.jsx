/**
 * components/ReplyModal.jsx
 *
 * Quote builder modal — three steps:
 *   1. Build line items (with custom item decision flow)
 *   2. Generate PDF
 *   3. Respond — compose & send via Email or WhatsApp
 *
 * On open:   request status → REVIEW  (via onStatusChange prop)
 * On respond: status → QUOTED, saves quote_data + pdf_url
 *
 * npm install jspdf
 */

import { useState, useEffect, useRef } from "react";
import { useTheme } from "../ThemeProvider.jsx";
import { F, fmtDate, timeAgo, statusToken } from "../tokens.js";

/* ── helpers ── */
const currency = (n) =>
  `M ${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const slugName = (name, event) =>
  `${name.replace(/\s+/g, "_")}-${event.replace(/\s+/g, "_")}`;

/* ── PDF builder ── */
async function generateQuotePDF(request, items, declinedItems, note) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const m = 18, col = pw - m * 2;
  let y = m;

  const NAVY = [3,17,46], BLUE = [33,150,196], GREY = [120,135,160],
        BLACK = [20,30,50], AMBER = [200,120,20];

  /* header */
  doc.setFillColor(...NAVY); doc.rect(0,0,pw,38,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(20);
  doc.text("REFINED RENTALS", m, 16);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...BLUE);
  doc.text("COVERING EVERY OCCASION", m, 22);
  doc.setTextColor(180,195,215); doc.setFontSize(7.5);
  doc.text("+266 6363 0598  |  +266 5885 8114  |  refinedrentals.lso@gmail.com", m, 29);
  doc.text("Lesotho", m, 34);
  doc.setTextColor(...BLUE); doc.setFont("helvetica","bold"); doc.setFontSize(22);
  doc.text("QUOTE", pw-m, 20, {align:"right"});
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(180,195,215);
  doc.text(`Ref: RR-${Date.now().toString().slice(-6)}`, pw-m, 28, {align:"right"});
  doc.text(`Date: ${fmtDate(new Date().toISOString())}`, pw-m, 34, {align:"right"});
  y = 50;

  /* client + event block */
  doc.setFillColor(245,247,251); doc.roundedRect(m, y, col, 36, 2,2,"F");
  const half = col/2-4;
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...GREY);
  doc.text("PREPARED FOR", m+6, y+8);
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...BLACK);
  doc.text(request.name, m+6, y+16);
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...GREY);
  doc.text(request.email, m+6, y+23); doc.text(request.phone, m+6, y+29);
  const rx = m+half+8;
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...GREY);
  doc.text("EVENT DETAILS", rx, y+8);
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...BLACK);
  doc.text(`Type:      ${request.event}`, rx, y+16);
  // Date — handle single, overnight, and multiple-day events
  const eventDateStr =
    request.duration === "multiple"
      ? `${fmtDate(request.start_date)} – ${fmtDate(request.end_date)}`
      : fmtDate(request.date || request.start_date);
  doc.text(`Date:      ${eventDateStr}`, rx, y+23);
  doc.text(`Location:  ${request.location || ""}`, rx, y+30);
  let ey = 37;
  // Tent size and config if provided
  if (request.tent_size) {
    const sizeLabel = request.tent_size === "9x9" ? "9 × 9m" : request.tent_size === "9x12" ? "9 × 12m" : request.tent_size === "9x15" ? "9 × 15m" : request.tent_size;
    const cfgLabel  = request.tent_config === "cinema" ? "Cinema / Chairs Only" : request.tent_config === "tables" ? "With Round Tables" : (request.tent_config || "");
    doc.text(`Tent:      ${sizeLabel}${cfgLabel ? " · " + cfgLabel : ""}`, rx, y+ey);
    ey += 7;
  }
  y += ey + 9;

  /* table header */
  doc.setFillColor(...NAVY); doc.rect(m,y,col,9,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(8);
  const dW=col*0.44, qW=col*0.12;
  doc.text("Description", m+4, y+6);
  doc.text("Qty", m+dW+4, y+6);
  doc.text("Unit Price", m+dW+qW, y+6);
  doc.text("Total", pw-m-4, y+6, {align:"right"});
  y += 9;

  const activeRows = items.filter(i => i.description.trim() && !i._declined);
  let grand = 0;
  activeRows.forEach((item,idx) => {
    const lineTotal = (Number(item.qty)||1)*(Number(item.unitPrice)||0);
    grand += lineTotal;
    const rowH = item.subtitle ? 14 : 9; // taller row if subtitle present
    if (idx%2===0) { doc.setFillColor(250,251,253); doc.rect(m,y,col,rowH,"F"); }
    doc.setDrawColor(220,225,235); doc.setLineWidth(0.2); doc.line(m,y+rowH,m+col,y+rowH);
    doc.setTextColor(...BLACK); doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(item.description, dW-6)[0], m+4, y+6);
    // Subtitle (e.g. tent config) printed smaller below description
    if (item.subtitle) {
      doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(130,145,165);
      doc.text(item.subtitle, m+4, y+11.5);
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...BLACK);
    }
    doc.text(String(item.qty||1), m+dW+4, y+6);
    doc.text(`M ${Number(item.unitPrice||0).toFixed(2)}`, m+dW+qW, y+6);
    doc.text(`M ${lineTotal.toFixed(2)}`, pw-m-4, y+6, {align:"right"});
    y += rowH;
  });
  y += 4;

  /* totals */
  const bx=m+col*0.58, bw=col*0.42;
  const tRow = (label,value,bold,hi) => {
    if (hi) { doc.setFillColor(...NAVY); doc.rect(bx,y,bw,10,"F"); }
    doc.setFont("helvetica", bold?"bold":"normal");
    doc.setFontSize(bold?9.5:8.5);
    doc.setTextColor(hi?255:(bold?BLACK[0]:GREY[0]), hi?255:(bold?BLACK[1]:GREY[1]), hi?255:(bold?BLACK[2]:GREY[2]));
    doc.text(label, bx+4, y+(hi?7:6));
    doc.text(value, pw-m-4, y+(hi?7:6), {align:"right"});
    y += hi?10:8;
  };
  tRow("Subtotal", `M ${grand.toFixed(2)}`);
  doc.setDrawColor(...BLUE); doc.setLineWidth(0.4); doc.line(bx,y,pw-m,y); y+=3;
  tRow("TOTAL DUE", `M ${grand.toFixed(2)}`, true, true);
  y += 8;

  /* deposit */
  doc.setFillColor(...BLUE); doc.rect(m,y,col,10,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(8);
  doc.text("Full payment is required no later than 48 hours before the event date.", m+4, y+6.5);
  y += 18;

  /* declined items */
  if (declinedItems.length > 0) {
    doc.setFillColor(250,244,230); doc.roundedRect(m,y,col,10,1,1,"F");
    doc.setDrawColor(...AMBER); doc.setLineWidth(0.3); doc.roundedRect(m,y,col,10,1,1,"S");
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...AMBER);
    doc.text("ITEMS WE ARE UNABLE TO PROVIDE", m+4, y+6.5);
    y += 14;
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...GREY);
    doc.text("The following requested items fall outside our current service offering:", m, y);
    y += 7;
    declinedItems.forEach(item => {
      doc.setFillColor(252,248,240); doc.rect(m,y,col,8,"F");
      doc.setDrawColor(230,215,185); doc.setLineWidth(0.2); doc.rect(m,y,col,8,"S");
      doc.setFillColor(...AMBER); doc.rect(m,y,2.5,8,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...BLACK);
      doc.text(item.description, m+6, y+5.5); y+=8;
      const rLines = doc.splitTextToSize(`Reason: ${item.declineReason}`, col-6);
      doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(...GREY);
      doc.text(rLines, m+6, y+5); y+=rLines.length*5+6;
    });
    y += 2;
  }

  /* note */
  if (note?.trim()) {
    doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...BLACK);
    doc.text("Additional Notes", m, y); y+=5;
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...GREY);
    const nl = doc.splitTextToSize(note.trim(), col);
    doc.text(nl, m, y); y+=nl.length*5+6;
  }

  /* footer */
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(245,247,251); doc.rect(0,ph-18,pw,18,"F");
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...GREY);
  doc.text("Refined Rentals (PTY) LTD  ·  Lesotho  ·  refinedrentals.lso@gmail.com  ·  +266 6363 0598", pw/2, ph-9, {align:"center"});
  doc.text("This quote is valid for 7 days from the date of issue.", pw/2, ph-4.5, {align:"center"});

  return doc;
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function ReplyModal({ request, reviseReason, onClose, onQuoteSent, onStatusChange }) {
  const { C, F } = useTheme();

  /* Revision mode — pre-load prior quote items if reviseReason supplied */
  const isRevision = Boolean(reviseReason);
  const priorQuote = request.quote_data;

  /* custom item state — skip decision flow on revision */
  const hasCustom = !isRevision && Boolean(request.other?.trim());
  const [customDecision,   setCustomDecision]   = useState(hasCustom ? "pending" : null);
  const [declineReason,    setDeclineReason]    = useState("");
  const [showDeclineInput, setShowDeclineInput] = useState(false);

  /* line items — pre-load from prior quote on revision */
  const buildInitialItems = () => {
    if (isRevision && priorQuote?.items?.length) {
      // Clone prior items so prices and qtys are editable
      return priorQuote.items.map(i => ({
        ...i,
        id: uid(), // fresh id for React keys
        _declined: false, // all items start included in revision
      }));
    }
    const tentSizeLabel = request.tent_size === "9x9" ? "9 × 9m" : request.tent_size === "9x12" ? "9 × 12m" : request.tent_size === "9x15" ? "9 × 15m" : (request.tent_size || "");
    const tentCfgLabel  = request.tent_config === "cinema" ? "Cinema / Chairs Only" : request.tent_config === "tables" ? "With Round Tables" : (request.tent_config || "");
    const tentSubtitle  = (tentSizeLabel || tentCfgLabel) ? `${tentSizeLabel}${tentCfgLabel ? " · " + tentCfgLabel : ""}` : "";

    // services can be [{name, qty}] (new shape) or ["string"] (legacy)
    const svc = (request.services || []).map(s => {
      const name = typeof s === "object" ? s.name : s;
      const qty  = typeof s === "object" && s.qty ? s.qty : 1;
      return {
        id: uid(), description: name, qty,
        unitPrice: "",
        subtitle: name === "Frame Tents" && tentSubtitle ? tentSubtitle : "",
        _isDelivery: false, _isOther: false, _declined: false,
      };
    });
    const other = hasCustom ? [{
      id: uid(), description: "", qty: 1, unitPrice: "",
      _isDelivery: false, _isOther: true, _declined: false,
      _customerText: request.other, // keep original for reference — not used as description
    }] : [];
    const del = [{ id: uid(), description: "Delivery, Setup & Collection", qty: 1, unitPrice: "", _isDelivery: true, _isOther: false, _declined: false }];
    return [...svc, ...other, ...del];
  };

  const [items,    setItems]    = useState(buildInitialItems);
  const [note,     setNote]     = useState(isRevision && priorQuote?.note ? priorQuote.note : "");

  /* PDF state */
  const [pdfDoc,    setPdfDoc]    = useState(null); // jsPDF instance
  const [pdfBlob,   setPdfBlob]   = useState(null);
  const [pdfUrl,    setPdfUrl]    = useState(null); // object URL for preview
  const [pdfBase64, setPdfBase64] = useState(null); // permanent base64 for storage
  const [pdfReady,  setPdfReady]  = useState(false);
  const [building,  setBuilding]  = useState(false);

  /* respond panel */
  const [showRespond, setShowRespond] = useState(false);
  const [channels,    setChannels]    = useState({ email: false, whatsapp: false }); // both can be active
  const [sending,     setSending]     = useState(false);

  const overlayRef = useRef(null);

  /* On open: move status to REVIEW immediately */
  useEffect(() => {
    if (request.status === "NEW") {
      onStatusChange("REVIEW");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  /* item helpers */
  const updateItem = (id, field, val) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  const addItem = () =>
    setItems(prev => [...prev, { id: uid(), description: "", qty: 1, unitPrice: "", _isDelivery: false, _isOther: false, _declined: false }]);
  const removeItem = id => setItems(prev => prev.filter(i => i.id !== id));

  /* custom decision */
  const includeCustom = () => {
    setCustomDecision("included");
    setShowDeclineInput(false);
    setItems(prev => prev.map(i => i._isOther ? { ...i, _declined: false } : i));
  };
  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setCustomDecision("declined");
    setShowDeclineInput(false);
    setItems(prev => prev.map(i => i._isOther ? { ...i, _declined: true, declineReason: declineReason.trim() } : i));
  };
  const undoDecision = () => {
    setCustomDecision("pending");
    setDeclineReason(""); setShowDeclineInput(false);
    setItems(prev => prev.map(i => i._isOther ? { ...i, _declined: false, declineReason: "" } : i));
  };

  const pendingDecision = customDecision === "pending";
  const activeItems   = items.filter(i => !i._declined);
  const declinedItems = items.filter(i => i._declined);
  const grandTotal    = activeItems.reduce((s,i) => s + (Number(i.qty)||1)*(Number(i.unitPrice)||0), 0);
  const filename      = `${slugName(request.name, request.event)}.pdf`;

  /* generate PDF */
  const handleBuildPDF = async () => {
    setBuilding(true);
    try {
      const doc    = await generateQuotePDF(request, activeItems, declinedItems, note);
      const blob   = doc.output("blob");
      const url    = URL.createObjectURL(blob);
      // Convert to base64 so it can be stored persistently in the database
      const reader = new FileReader();
      reader.onload = () => {
        setPdfBase64(reader.result); // full data URI: "data:application/pdf;base64,..."
      };
      reader.readAsDataURL(blob);
      setPdfDoc(doc); setPdfBlob(blob); setPdfUrl(url); setPdfReady(true);
    } catch(err) {
      console.error(err);
      alert("PDF failed. Run: npm install jspdf");
    }
    setBuilding(false);
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(pdfBlob);
    a.download = filename; a.click();
  };

  /* messages */
  const declinedNote = declinedItems.length > 0
    ? `\n\nPlease note: we are unable to provide "${declinedItems[0].description}". Reason: ${declinedItems[0].declineReason}. Full details are in the attached PDF.`
    : "";

  const emailSubject = encodeURIComponent(`Your Quote from Refined Rentals — ${request.event}, ${fmtDate(request.date || request.startDate)}`);
  const emailBodyRaw =
`Dear ${request.name.split(" ")[0]},

Thank you for reaching out to Refined Rentals.

Please find your quote attached to this message.

We have reviewed your request and prepared a personalised quote for your ${request.event}. All details, including itemised pricing, are included in the attached PDF.

Please note: full payment is required no later than 48 hours before the date of your event.${declinedNote}

Do not hesitate to contact us should you have any questions.

Kind regards,
Refined Rentals
+266 6363 0598 / +266 5885 8114`;

  const waBodyRaw =
`Hello ${request.name.split(" ")[0]},

This is Refined Rentals. Thank you for your enquiry regarding your *${request.event}*.

We have reviewed your request and prepared a quote for you. Please find the attached PDF for the full breakdown.

Please note that *full payment is required no later than 48 hours before the date of your event*.${declinedItems.length>0?`\n\n_Please note: we are unable to provide "${declinedItems[0].description}". Full details are in the attached PDF._`:""}

Feel free to reply here or call us if you have any questions. 🙏

*Refined Rentals*
+266 6363 0598 / +266 5885 8114`;

  const waPhone = request.phone.replace(/\D/g,"");

  /* send quote */
  const handleSend = () => {
    setSending(true);
    const quoteData = {
      items: activeItems,
      declinedItems,
      grandTotal,
      note,
      channels,
      messageEmail: emailBodyRaw,
      messageWA:    waBodyRaw,
      reviseReason: reviseReason || null,
      pdfBase64:    pdfBase64 || null, // stored permanently in DB
    };
    setTimeout(() => {
      setSending(false);
      // Pass pdfBase64 as the "url" — RequestDetail stores it in quote_data
      onQuoteSent(quoteData, pdfBase64 || pdfUrl);
    }, 600);
  };

  /* input style */
  const iSm = { background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:2, color:C.textPrimary, fontFamily:F.body, fontWeight:300, outline:"none", transition:"border-color 0.2s" };
  const fi = e => { e.target.style.borderColor = C.blue; };
  const fo = e => { e.target.style.borderColor = C.border; };

  return (
    <div ref={overlayRef} onClick={e=>{ if(e.target===overlayRef.current) onClose(); }} style={{
      position:"fixed", inset:0, zIndex:200,
      background:"rgba(2,8,22,0.92)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"1.5rem 1rem", overflowY:"auto",
      animation:"rrFadeIn 0.2s ease",
    }}>
      <div style={{
        background:C.surfaceUp, border:`1px solid ${C.borderBlue}`,
        borderRadius:3, width:"100%", maxWidth:700,
        padding:"2rem", position:"relative",
        animation:"rrSlideUp 0.25s cubic-bezier(.25,.46,.45,.94)",
        marginBottom:"1.5rem",
      }}>

        {/* close */}
        <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"none", border:`1px solid ${C.border}`, borderRadius:"50%", width:30, height:30, cursor:"pointer", color:C.textDim, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.blue;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textDim;}}
        >✕</button>

        {/* header */}
        <div style={{marginBottom:"1.75rem",paddingRight:36}}>
          <div style={{fontSize:9,letterSpacing:"0.22em",textTransform:"uppercase",color:C.blue,fontFamily:F.body,fontWeight:600,marginBottom:6}}>Quote Builder</div>
          <h3 style={{fontFamily:F.display,fontSize:"1.6rem",fontWeight:500,color:C.textPrimary,margin:"0 0 0.25rem"}}>Build Quote for {request.name}</h3>
          <p style={{margin:0,color:C.textSecondary,fontSize:"0.82rem",fontFamily:F.body,fontWeight:300}}>
            {request.event} ·{" "}
            {request.duration === "multiple"
              ? `${fmtDate(request.start_date)} – ${fmtDate(request.end_date)}`
              : fmtDate(request.date || request.start_date)}
            {request.location ? ` · ${request.location}` : ""}
            {request.tent_size ? ` · ${request.tent_size === "9x9" ? "9×9m" : request.tent_size === "9x12" ? "9×12m" : "9×15m"}${request.tent_config === "cinema" ? " (Cinema)" : request.tent_config === "tables" ? " (Round Tables)" : ""}` : ""}
          </p>
        </div>

        {/* ── Custom item decision banner ── */}
        {hasCustom && (
          <div style={{
            marginBottom:"1.75rem",
            border:`1.5px solid ${customDecision==="pending"?"rgba(232,160,32,0.5)":customDecision==="included"?"rgba(39,168,110,0.4)":"rgba(217,79,79,0.35)"}`,
            borderRadius:3,
            background:customDecision==="pending"?"rgba(232,160,32,0.07)":customDecision==="included"?"rgba(39,168,110,0.07)":"rgba(217,79,79,0.06)",
            overflow:"hidden", transition:"all 0.3s",
          }}>
            {/* banner header */}
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:`1px solid rgba(255,255,255,0.06)`,background:"rgba(0,0,0,0.15)"}}>
              <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:customDecision==="pending"?"#e8a020":customDecision==="included"?"#27a86e":C.danger}}/>
              <span style={{fontSize:9,letterSpacing:"0.22em",textTransform:"uppercase",fontFamily:F.body,fontWeight:700,color:customDecision==="pending"?"#e8a020":customDecision==="included"?"#27a86e":C.danger}}>
                {customDecision==="pending"&&"⚠ Custom Request — Action Required"}
                {customDecision==="included"&&"✓ Custom Item Included in Quote"}
                {customDecision==="declined"&&"✕ Custom Item Declined"}
              </span>
              {customDecision!=="pending"&&(
                <button onClick={undoDecision} style={{marginLeft:"auto",background:"none",border:`1px solid ${C.border}`,borderRadius:2,color:C.textDim,cursor:"pointer",padding:"3px 10px",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:F.body,fontWeight:600,transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.textSecondary;e.currentTarget.style.color=C.textPrimary;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textDim;}}
                >Undo</button>
              )}
            </div>
            {/* banner body */}
            <div style={{padding:"12px 14px"}}>
              <div style={{fontSize:"0.85rem",fontFamily:F.body,fontWeight:300,color:C.textSecondary,marginBottom:10,lineHeight:1.6,background:"rgba(255,255,255,0.04)",borderRadius:2,padding:"8px 12px",borderLeft:`3px solid ${C.border}`}}>
                <span style={{color:C.textDim,fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:600,display:"block",marginBottom:4}}>Customer wrote:</span>
                {request.other}
              </div>
              {customDecision==="pending"&&!showDeclineInput&&(
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <button onClick={includeCustom} style={{background:"rgba(39,168,110,0.12)",border:"1px solid rgba(39,168,110,0.35)",color:"#27a86e",cursor:"pointer",padding:"9px 18px",borderRadius:2,fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:600,fontFamily:F.body,transition:"all 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(39,168,110,0.2)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(39,168,110,0.12)";}}
                  >✓ Yes, we can provide this — include in quote</button>
                  <button onClick={()=>setShowDeclineInput(true)} style={{background:"rgba(217,79,79,0.1)",border:"1px solid rgba(217,79,79,0.3)",color:C.danger,cursor:"pointer",padding:"9px 18px",borderRadius:2,fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:600,fontFamily:F.body,transition:"all 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(217,79,79,0.18)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(217,79,79,0.1)";}}
                  >✕ We cannot provide this</button>
                </div>
              )}
              {customDecision==="pending"&&showDeclineInput&&(
                <div style={{animation:"rrFadeIn 0.18s ease"}}>
                  <label style={{display:"block",fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:C.danger,fontFamily:F.body,marginBottom:7}}>Reason for declining (shown to customer on PDF)</label>
                  <textarea autoFocus value={declineReason} onChange={e=>setDeclineReason(e.target.value)} rows={2}
                    placeholder="e.g. We do not currently offer stage hire. We recommend contacting a local AV supplier."
                    style={{...iSm,width:"100%",boxSizing:"border-box",padding:"10px 12px",fontSize:"0.85rem",resize:"vertical",lineHeight:1.6,borderColor:"rgba(217,79,79,0.35)",marginBottom:10}}
                    onFocus={e=>{e.target.style.borderColor=C.danger;}} onBlur={e=>{e.target.style.borderColor="rgba(217,79,79,0.35)";}}
                  />
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={confirmDecline} disabled={!declineReason.trim()} style={{background:declineReason.trim()?C.danger:"rgba(217,79,79,0.2)",border:"none",color:C.white,cursor:declineReason.trim()?"pointer":"not-allowed",padding:"9px 18px",borderRadius:2,fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:600,fontFamily:F.body,transition:"background 0.2s"}}>Confirm Decline</button>
                    <button onClick={()=>{setShowDeclineInput(false);setDeclineReason("");}} style={{background:"none",border:`1px solid ${C.border}`,color:C.textDim,cursor:"pointer",padding:"9px 16px",borderRadius:2,fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:F.body,fontWeight:500}}>Cancel</button>
                  </div>
                </div>
              )}
              {customDecision==="included" && (
                <div>
                  <p style={{margin:"0 0 8px",color:"#27a86e",fontSize:"0.83rem",fontFamily:F.body,fontWeight:300}}>
                    Item added below. <strong style={{fontWeight:600}}>Enter a clean item name</strong> in the description field — the customer's original wording will not appear on the quote.
                  </p>
                  <div style={{fontSize:"0.78rem",color:C.textDim,fontFamily:F.body,fontWeight:300,fontStyle:"italic",lineHeight:1.5}}>
                    Customer wrote: "{request.other}"
                  </div>
                </div>
              )}
              {customDecision==="declined"&&(
                <div>
                  <p style={{margin:"0 0 6px",color:C.textSecondary,fontSize:"0.83rem",fontFamily:F.body,fontWeight:300}}>Removed from quote. The reason will appear on the PDF.</p>
                  <div style={{background:"rgba(0,0,0,0.2)",borderRadius:2,padding:"8px 12px",borderLeft:`3px solid ${C.danger}`}}>
                    <span style={{color:C.textDim,fontSize:11,fontFamily:F.body}}>Reason: </span>
                    <span style={{color:C.textSecondary,fontSize:"0.83rem",fontFamily:F.body,fontStyle:"italic"}}>{declinedItems[0]?.declineReason}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* pending blocker */}
        {pendingDecision&&(
          <div style={{background:"rgba(2,8,22,0.55)",borderRadius:2,padding:"12px 16px",marginBottom:"1.5rem",border:"1px dashed rgba(232,160,32,0.3)",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>⚠</span>
            <p style={{margin:0,color:"#e8a020",fontSize:"0.83rem",fontFamily:F.body}}>Please make a decision on the custom item above before building the quote.</p>
          </div>
        )}

        {/* ── content dims when pending ── */}
        <div style={{opacity:pendingDecision?0.35:1,pointerEvents:pendingDecision?"none":"auto",transition:"opacity 0.3s"}}>

          {/* STEP 1 — line items */}
          {isRevision && (
              <div style={{ marginBottom:"1rem", background:"rgba(232,160,32,0.08)", border:"1px solid rgba(232,160,32,0.25)", borderRadius:2, padding:"9px 14px" }}>
                <div style={{ fontSize:8.5, letterSpacing:"0.14em", textTransform:"uppercase", color:"#e8a020", fontFamily:F.body, fontWeight:600, marginBottom:3 }}>Revising Quote</div>
                <p style={{ margin:0, color:C.textSecondary, fontSize:"0.8rem", fontFamily:F.body, fontWeight:300, lineHeight:1.55 }}>
                  <strong style={{ color:C.textPrimary, fontWeight:500 }}>Reason:</strong> {reviseReason}
                </p>
              </div>
            )}
          <SectionHead num="1" label="Quote Line Items" />
          <div style={{display:"grid",gridTemplateColumns:"1fr 56px 100px 32px",gap:8,padding:"6px 0",marginBottom:4}}>
            {["Description","Qty","Unit Price (M)",""].map(h=>(
              <div key={h} style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.textDim,fontFamily:F.body}}>{h}</div>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
            {activeItems.map(item=>(
              <div key={item.id} style={{display:"grid",gridTemplateColumns:"1fr 56px 100px 32px",gap:8,alignItems:"start",background:item._isOther?"rgba(39,168,110,0.05)":"transparent",borderRadius:item._isOther?2:0,padding:item._isOther?"4px 6px":"0",border:item._isOther?"1px solid rgba(39,168,110,0.2)":"none"}}>
                {/* Description + optional subtitle */}
                <div style={{position:"relative"}}>
                  <input type="text" value={item.description} onChange={e=>updateItem(item.id,"description",e.target.value)}
                    placeholder={item._isOther ? "Enter clean item name (e.g. Portable Generators ×2)" : "Item description"}
                    onFocus={fi} onBlur={fo}
                    style={{...iSm,width:"100%",boxSizing:"border-box",padding:"9px 10px",fontSize:"0.85rem",paddingRight:item._isOther?72:10,
                      borderColor: item._isOther && !item.description.trim() ? "rgba(232,160,32,0.5)" : undefined}} />
                  {item._isOther&&<span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:8.5,color:"#27a86e",fontFamily:F.body,background:"rgba(39,168,110,0.12)",padding:"2px 7px",borderRadius:2,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600}}>Custom</span>}
                  {item.subtitle&&(
                    <div style={{fontSize:10,color:C.textDim,fontFamily:F.body,fontWeight:300,marginTop:3,paddingLeft:2}}>{item.subtitle}</div>
                  )}
                </div>
                {/* Qty — editable for all items */}
                <input type="number" min="1" value={item.qty} onChange={e=>updateItem(item.id,"qty",e.target.value)} onFocus={fi} onBlur={fo} style={{...iSm,padding:"9px 8px",fontSize:"0.85rem",textAlign:"center",width:"100%",boxSizing:"border-box",marginTop:0}} />
                <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e=>updateItem(item.id,"unitPrice",e.target.value)} placeholder="0.00" onFocus={fi} onBlur={fo} style={{...iSm,padding:"9px 8px",fontSize:"0.85rem",width:"100%",boxSizing:"border-box"}} />
                <button onClick={()=>removeItem(item.id)} disabled={item._isDelivery} style={{background:"none",border:"none",color:item._isDelivery?"transparent":C.textDim,cursor:item._isDelivery?"default":"pointer",fontSize:16,padding:0,lineHeight:1,transition:"color 0.2s",marginTop:2}}
                  onMouseEnter={e=>{if(!item._isDelivery)e.currentTarget.style.color=C.danger;}}
                  onMouseLeave={e=>{if(!item._isDelivery)e.currentTarget.style.color=C.textDim;}}
                >×</button>
              </div>
            ))}
          </div>

          <button onClick={addItem} style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:2,color:C.textDim,cursor:"pointer",padding:"8px",width:"100%",fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",fontFamily:F.body,fontWeight:500,transition:"border-color 0.2s, color 0.2s",marginBottom:"1.25rem"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.blue;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textDim;}}
          >+ Add Line Item</button>

          {/* total */}
          <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:16,padding:"12px 14px",background:C.blueDim,border:`1px solid ${C.borderBlue}`,borderRadius:2,marginBottom:"1.5rem"}}>
            <span style={{fontFamily:F.body,fontSize:"0.85rem",color:C.textSecondary}}>Total</span>
            <span style={{fontFamily:F.display,fontSize:"1.6rem",fontWeight:600,color:C.blue}}>{currency(grandTotal)}</span>
          </div>

          {/* note */}
          <div style={{marginBottom:"1.75rem"}}>
            <label style={{display:"block",fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:C.textDim,fontFamily:F.body,marginBottom:6}}>Additional Note (optional)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="e.g. Prices valid for 7 days. Contact us to discuss further requirements." style={{...iSm,width:"100%",boxSizing:"border-box",padding:"10px 12px",fontSize:"0.85rem",resize:"vertical",lineHeight:1.65}} onFocus={fi} onBlur={fo} />
          </div>

          {/* STEP 2 — generate PDF */}
          <SectionHead num="2" label="Generate Quote PDF" />
          <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${C.border}`,borderRadius:2,padding:"1rem 1.25rem",marginBottom:"1.75rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontFamily:F.body,fontSize:"0.88rem",color:C.textPrimary,fontWeight:500,marginBottom:3}}>{filename}</div>
                <div style={{fontFamily:F.body,fontSize:11,color:C.textDim,fontWeight:300}}>
                  {pdfReady?`✓ PDF ready${declinedItems.length>0?" · includes declined items section":""}  — download or respond below`:"Click generate to build the quote PDF"}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleBuildPDF} disabled={building} style={{background:building?"rgba(33,150,196,0.3)":C.blueDim,border:`1px solid ${C.borderBlue}`,color:C.blue,cursor:building?"wait":"pointer",padding:"9px 18px",borderRadius:2,fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:600,fontFamily:F.body,display:"flex",alignItems:"center",gap:7}}>
                  {building?<><Spinner/>Generating…</>:<><PDFIcon/>{pdfReady?"Regenerate":"Generate PDF"}</>}
                </button>
                {pdfReady&&(
                  <button onClick={downloadPDF} style={{background:C.blue,border:"none",color:C.white,cursor:"pointer",padding:"9px 18px",borderRadius:2,fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:600,fontFamily:F.body,display:"flex",alignItems:"center",gap:7,transition:"background 0.25s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.blueLight}
                    onMouseLeave={e=>e.currentTarget.style.background=C.blue}
                  ><DownloadIcon/>Download PDF</button>
                )}
              </div>
            </div>

            {/* RESPOND button — only after PDF ready */}
            {pdfReady&&!showRespond&&(
              <div style={{marginTop:"0.9rem",paddingTop:"0.9rem",borderTop:`1px solid ${C.border}`}}>
                <button onClick={()=>setShowRespond(true)} style={{background:"linear-gradient(135deg,#1a6ab5,#2196c4)",border:"none",color:C.white,cursor:"pointer",padding:"11px 24px",borderRadius:2,fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:600,fontFamily:F.body,display:"flex",alignItems:"center",gap:8,transition:"opacity 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.87"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                >
                  <SendIcon/> Respond to Customer
                </button>
              </div>
            )}
          </div>

          {/* STEP 3 — respond panel */}
          {pdfReady&&showRespond&&(
            <div style={{animation:"rrFadeIn 0.2s ease"}}>
              <SectionHead num="3" label="Respond to Customer" />

              {/* channel choice — toggle both */}
              <div style={{marginBottom:"1rem"}}>
                <div style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.textDim,fontFamily:F.body,marginBottom:8}}>Send via (select one or both)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    {id:"email",    icon:<EmailIcon/>, label:"Email",    sub:request.email},
                    {id:"whatsapp", icon:<WAIcon/>,    label:"WhatsApp", sub:request.phone},
                  ].map(ch=>{
                    const on = channels[ch.id];
                    return (
                      <button key={ch.id} onClick={()=>setChannels(c=>({...c,[ch.id]:!c[ch.id]}))} style={{background:on?C.blueDim:"rgba(255,255,255,0.03)",border:`1px solid ${on?C.blue:C.border}`,borderRadius:2,padding:"14px 10px",cursor:"pointer",textAlign:"center",transition:"all 0.2s",position:"relative"}}>
                        {on&&<div style={{position:"absolute",top:8,right:8,width:16,height:16,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:9,fontWeight:700}}>✓</span></div>}
                        <div style={{color:on?C.blue:C.textDim,marginBottom:6,display:"flex",justifyContent:"center"}}>{ch.icon}</div>
                        <div style={{fontFamily:F.body,fontWeight:600,fontSize:"0.85rem",color:on?C.blue:C.textPrimary,marginBottom:3}}>{ch.label}</div>
                        <div style={{fontFamily:F.body,fontSize:10,color:C.textDim,wordBreak:"break-all"}}>{ch.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* message previews */}
              {(channels.email||channels.whatsapp)&&(
                <div style={{marginBottom:"1rem"}}>
                  {channels.email&&(
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:"#2196c4",fontFamily:F.body,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><EmailIcon/>Email preview</div>
                      <pre style={{margin:"0 0 8px",color:C.textSecondary,fontSize:"0.78rem",fontFamily:F.body,fontWeight:300,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"rgba(0,0,0,0.2)",padding:"10px 12px",borderRadius:2,maxHeight:160,overflowY:"auto"}}>{emailBodyRaw}</pre>
                      <a href={`mailto:${request.email}?subject=${emailSubject}&body=${encodeURIComponent(emailBodyRaw)}`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:7,background:"#2196c4",color:C.white,padding:"8px 16px",borderRadius:2,textDecoration:"none",fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:600,fontFamily:F.body}}>
                        <EmailIcon/> Open Email Draft
                      </a>
                    </div>
                  )}
                  {channels.whatsapp&&(
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:"#25d366",fontFamily:F.body,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><WAIcon/>WhatsApp preview</div>
                      <pre style={{margin:"0 0 8px",color:C.textSecondary,fontSize:"0.78rem",fontFamily:F.body,fontWeight:300,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"rgba(0,0,0,0.2)",padding:"10px 12px",borderRadius:2,maxHeight:160,overflowY:"auto"}}>{waBodyRaw}</pre>
                      <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waBodyRaw)}`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:7,background:"#25d366",color:C.white,padding:"8px 16px",borderRadius:2,textDecoration:"none",fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:600,fontFamily:F.body}}>
                        <WAIcon/> Open WhatsApp
                      </a>
                    </div>
                  )}
                  <p style={{margin:"8px 0 0",color:C.textDim,fontSize:11,fontFamily:F.body,fontWeight:300}}>Open each channel above, attach the PDF, send — then confirm below.</p>
                </div>
              )}

              {(channels.email||channels.whatsapp)&&(
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <button onClick={handleSend} disabled={sending} style={{background:sending?"rgba(33,150,196,0.4)":C.blue,border:"none",color:C.white,cursor:sending?"wait":"pointer",padding:"12px 28px",borderRadius:2,fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:600,fontFamily:F.body,transition:"background 0.25s",display:"flex",alignItems:"center",gap:8}}
                    onMouseEnter={e=>{if(!sending)e.currentTarget.style.background=C.blueLight;}}
                    onMouseLeave={e=>{if(!sending)e.currentTarget.style.background=C.blue;}}
                  >
                    {sending?<><Spinner/>Saving…</>:<><SendIcon/>Quote Sent — Mark as Quoted</>}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>{/* end dims wrapper */}
      </div>
      <style>{`
        @keyframes rrFadeIn  {from{opacity:0}to{opacity:1}}
        @keyframes rrSlideUp {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes rrSpin    {to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

/* ── sub-components ── */
function SectionHead({num,label}) {
  const { C, F } = useTheme();

  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"0.9rem"}}>
      <div style={{width:22,height:22,borderRadius:"50%",background:C.blueDim,border:`1px solid ${C.borderBlue}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.blue,fontFamily:F.body,flexShrink:0}}>{num}</div>
      <span style={{fontFamily:F.body,fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:C.textDim,fontWeight:600}}>{label}</span>
      <div style={{flex:1,height:1,background:C.border}}/>
    </div>
  );
}

function uid() { return Math.random().toString(36).slice(2); }

/* ── icons ── */
const ic = {width:16,height:16};
function PDFIcon()      {
  const { C, F } = useTheme();
return <svg viewBox="0 0 16 16" fill="none" style={ic}><rect x="2" y="1" width="10" height="13" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;}
function DownloadIcon() {
  const { C, F } = useTheme();
return <svg viewBox="0 0 16 16" fill="none" style={ic}><path d="M8 2v8M5 7l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
function EmailIcon()    {
  const { C, F } = useTheme();
return <svg viewBox="0 0 16 16" fill="none" style={ic}><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M1 4l7 5 7-5" stroke="currentColor" strokeWidth="1.4"/></svg>;}
function WAIcon()       {
  const { C, F } = useTheme();
return <svg viewBox="0 0 16 16" fill="none" style={ic}><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 5.5c.5 1 1 2 2 2.5s2 .5 2.5 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;}
function SendIcon()     {
  const { C, F } = useTheme();
return <svg viewBox="0 0 16 16" fill="none" style={ic}><path d="M2 8l12-6-6 12-2-4-4-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;}
function Spinner()      {
  const { C, F } = useTheme();
return <svg viewBox="0 0 16 16" fill="none" style={{...ic,animation:"rrSpin 0.8s linear infinite"}}><circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.25)" strokeWidth="2"/><path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;}