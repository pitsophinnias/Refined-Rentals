/**
 * lib/email.js
 * Transactional email via Resend — new-request notifications to staff,
 * and quote emails to customers. Every send is fire-and-forget from the
 * caller's point of view: failures are logged, never thrown.
 */

const { Resend } = require("resend");
const { pool } = require("../db.js");

// Local/test sending domain. Switch to "Refined Rentals <noreply@refinedrentals.co.ls>"
// once that domain is verified in the Resend dashboard for production.
const FROM = "Refined Rentals <onboarding@resend.dev>";

const NAVY = "#03112e";
const BLUE = "#2196c4";
const DEFAULT_WHATSAPP = "+26663840950";

let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn("⚠ RESEND_API_KEY not set — email notifications are disabled.");
}

/* ── helpers ─────────────────────────────────────────────────── */

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtDate(d) {
  if (!d) return "Not specified";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return "Not specified";
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function currency(n) {
  return `M ${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function eventDateText(request) {
  return request.duration === "multiple"
    ? `${fmtDate(request.start_date)} – ${fmtDate(request.end_date)}`
    : fmtDate(request.date || request.start_date);
}

function serviceListText(services) {
  if (!Array.isArray(services) || services.length === 0) return "None specified";
  return services.map(s => {
    const name = typeof s === "object" ? s.name : s;
    const qty  = typeof s === "object" && s.qty > 1 ? ` x${s.qty}` : "";
    return `${escapeHtml(name)}${qty}`;
  }).join(", ");
}

function infoRow(label, value) {
  return `<tr>
    <td style="padding:6px 14px 6px 0;color:#8894ac;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;color:#1a2436;font-size:14px;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

function wrapHtml(bodyHtml) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:6px;overflow:hidden;">
          <tr><td style="background:${NAVY};padding:22px 32px;">
            <span style="color:#ffffff;font-size:19px;font-weight:600;letter-spacing:0.02em;">Refined Rentals</span>
          </td></tr>
          <tr><td style="padding:32px;color:#1a2436;font-size:14px;line-height:1.65;">
            ${bodyHtml}
          </td></tr>
          <tr><td style="background:#f0f2f6;padding:16px 32px;color:#8894ac;font-size:11px;">
            Refined Rentals (PTY) LTD &middot; Lesotho
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function getNotificationEmails() {
  try {
    const { rows } = await pool.query("SELECT email FROM notification_emails WHERE active = TRUE");
    return rows.map(r => r.email);
  } catch (err) {
    console.error("Failed to load notification_emails:", err.message);
    return [];
  }
}

async function getWhatsAppNumber() {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'whatsapp_number'");
    return rows[0]?.value || DEFAULT_WHATSAPP;
  } catch (err) {
    return DEFAULT_WHATSAPP;
  }
}

/* ── New quote request → staff notification ─────────────────── */
async function sendNewRequestNotification(request) {
  if (!resend) {
    console.warn("Skipping new-request notification email — Resend not configured.");
    return;
  }

  const recipients = new Set();
  if (process.env.NOTIFY_EMAIL) recipients.add(process.env.NOTIFY_EMAIL);
  for (const email of await getNotificationEmails()) recipients.add(email);

  if (recipients.size === 0) {
    console.warn("No notification recipients configured — skipping new-request email.");
    return;
  }

  const html = wrapHtml(`
    <h2 style="margin:0 0 18px;color:${NAVY};font-size:18px;font-weight:600;">A new quote request has been submitted</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${infoRow("Customer", request.name)}
      ${infoRow("Phone", request.phone)}
      ${infoRow("Email", request.email || "Not provided")}
      ${infoRow("Event", request.event || "-")}
      ${infoRow("Date", eventDateText(request))}
      ${infoRow("Duration", request.duration || "-")}
      ${infoRow("Location", request.location || "-")}
      ${infoRow("Services", serviceListText(request.services))}
      ${infoRow("Message", request.message || "None")}
      ${infoRow("Source", request.source === "manual" ? "Manual Entry" : "Website")}
    </table>
    <p style="margin:26px 0 0;color:#55617c;">Log in to the admin dashboard to review and respond.</p>
    <p style="margin:16px 0 0;">
      <a href="https://admin.refinedrentals.co.ls" style="display:inline-block;background:${BLUE};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:4px;font-weight:600;font-size:13px;">View Request →</a>
    </p>
  `);

  try {
    await resend.emails.send({
      from: FROM,
      to: Array.from(recipients),
      subject: `New Quote Request — ${request.name} (${request.event || "Event"})`,
      html,
    });
  } catch (err) {
    console.error("Failed to send new-request notification email:", err.message);
  }
}

/* ── Quote sent → customer email ─────────────────────────────── */
async function sendQuoteToCustomer(request, quoteData) {
  if (!resend) {
    console.warn("Skipping quote email — Resend not configured.");
    return;
  }
  if (!request.email) {
    console.warn(`Skipping quote email for ${request.id} — customer has no email on file.`);
    return;
  }

  const whatsapp = await getWhatsAppNumber();
  const items = (quoteData?.items || []).filter(i => i.description?.trim());

  const itemRows = items.map(i => {
    const qty  = Number(i.qty) || 1;
    const unit = Number(i.unitPrice) || 0;
    return `<tr>
      <td style="padding:9px 0;border-bottom:1px solid #e7ebf2;font-size:13px;">${escapeHtml(i.description)}</td>
      <td style="padding:9px 0;border-bottom:1px solid #e7ebf2;font-size:13px;text-align:center;">${qty}</td>
      <td style="padding:9px 0;border-bottom:1px solid #e7ebf2;font-size:13px;text-align:right;">${currency(unit)}</td>
      <td style="padding:9px 0;border-bottom:1px solid #e7ebf2;font-size:13px;text-align:right;font-weight:600;">${currency(qty * unit)}</td>
    </tr>`;
  }).join("");

  const html = wrapHtml(`
    <p style="margin:0 0 16px;">Dear ${escapeHtml(request.name)},</p>
    ${quoteData?.personalNote ? `<p style="margin:0 0 20px;font-size:15px;color:#1e293b;line-height:1.7;white-space:pre-wrap">${escapeHtml(quoteData.personalNote)}</p>` : ""}
    <p style="margin:0 0 22px;color:#55617c;">Thank you for your interest in Refined Rentals. Please find your quote below.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${infoRow("Event", request.event || "-")}
      ${infoRow("Date", eventDateText(request))}
      ${infoRow("Location", request.location || "-")}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <th align="left"   style="padding-bottom:8px;border-bottom:2px solid ${NAVY};color:#8894ac;font-size:10.5px;text-transform:uppercase;letter-spacing:0.06em;">Service</th>
        <th align="center" style="padding-bottom:8px;border-bottom:2px solid ${NAVY};color:#8894ac;font-size:10.5px;text-transform:uppercase;letter-spacing:0.06em;">Qty</th>
        <th align="right"  style="padding-bottom:8px;border-bottom:2px solid ${NAVY};color:#8894ac;font-size:10.5px;text-transform:uppercase;letter-spacing:0.06em;">Unit</th>
        <th align="right"  style="padding-bottom:8px;border-bottom:2px solid ${NAVY};color:#8894ac;font-size:10.5px;text-transform:uppercase;letter-spacing:0.06em;">Subtotal</th>
      </tr>
      ${itemRows}
    </table>
    <p style="text-align:right;margin:18px 0 0;font-size:17px;font-weight:700;color:${NAVY};">Total: ${currency(quoteData?.grandTotal)}</p>
    ${quoteData?.note ? `<p style="margin:22px 0 0;padding:12px 16px;background:#f0f2f6;border-radius:4px;color:#55617c;font-size:13px;">${escapeHtml(quoteData.note)}</p>` : ""}
    <p style="margin:30px 0 0;">To accept this quote or ask any questions, please contact us:</p>
    <p style="margin:8px 0 0;color:#55617c;">WhatsApp: ${escapeHtml(whatsapp)}<br/>Email: info@refinedrentals.co.ls</p>
    <p style="margin:26px 0 0;">We look forward to covering your occasion.<br/>— The Refined Rentals Team</p>
  `);

  try {
    await resend.emails.send({
      from: FROM,
      to: [request.email],
      subject: `Your Quote from Refined Rentals — ${request.event || "Your Event"}`,
      html,
    });
  } catch (err) {
    console.error(`Failed to send quote email for ${request.id}:`, err.message);
  }
}

module.exports = { sendNewRequestNotification, sendQuoteToCustomer };
