// Lógica compartida de avisos: correo (Gmail o Resend) y WhatsApp (Cloud API de Meta).
import nodemailer from "nodemailer";

export const env = (key, fallback = "") => (process.env[key] || fallback).trim();
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const BRAND = () => env("SITE_NAME", "Pacta");
const BUSINESS_WA = () => env("BUSINESS_WHATSAPP", "525519531324");

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const firstName = (v) => String(v || "").trim().split(/\s+/)[0] || "";

export function mxPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 10) return "52" + d;
  if (d.length === 12 && d.startsWith("52")) return d;
  if (d.length === 13 && d.startsWith("521")) return "52" + d.slice(3);
  return "";
}

/* ---------- Proveedor de correo ---------- */
// Gmail (sin dominio propio): GMAIL_USER + GMAIL_APP_PASSWORD (contraseña de aplicación de Google).
// Resend (con dominio verificado): RESEND_API_KEY + MAIL_FROM.
export function mailProvider() {
  if (env("GMAIL_USER") && env("GMAIL_APP_PASSWORD")) return "gmail";
  if (env("RESEND_API_KEY") && env("MAIL_FROM")) return "resend";
  return null;
}
export const ownerEmail = () => env("OWNER_EMAIL") || env("GMAIL_USER");

let gmailTransport;
function gmail() {
  gmailTransport ||= nodemailer.createTransport({
    service: "gmail",
    auth: { user: env("GMAIL_USER"), pass: env("GMAIL_APP_PASSWORD").replace(/\s+/g, "") },
  });
  return gmailTransport;
}
export const verifyGmail = () => gmail().verify();

export async function sendEmail({ to, subject, html, replyTo, attachments = [] }) {
  const provider = mailProvider();
  if (provider === "gmail") {
    await gmail().sendMail({
      from: `"${BRAND()}" <${env("GMAIL_USER")}>`,
      to, subject, html,
      ...(replyTo ? { replyTo } : {}),
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.type })),
    });
    return;
  }
  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env("MAIL_FROM"), to: [to], subject, html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments.length ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return;
  }
  throw new Error("No hay proveedor de correo configurado");
}

/* ---------- WhatsApp ---------- */
export const whatsappReady = () => Boolean(env("WHATSAPP_TOKEN") && env("WHATSAPP_PHONE_ID") && env("WHATSAPP_TEMPLATE"));

export async function sendWhatsApp(to, params) {
  const res = await fetch(`https://graph.facebook.com/${env("WHATSAPP_API_VERSION", "v23.0")}/${env("WHATSAPP_PHONE_ID")}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: env("WHATSAPP_TEMPLATE"),
        language: { code: env("WHATSAPP_LANG", "es_MX") },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: String(text).slice(0, 200) })) }],
      },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
}

/* ---------- Plantillas de correo ---------- */
function layout(title, body) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1D1D1F">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;margin-bottom:20px">${esc(BRAND())}</div>
    <div style="background:#fff;border-radius:18px;padding:28px">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;margin:0 0 16px">${esc(title)}</h1>
      ${body}
    </div>
    <p style="font-size:12px;color:#6E6E73;margin-top:20px;line-height:1.5">${esc(BRAND())} es una plataforma de servicios jurídicos. Los contratos son redactados por abogados independientes con cédula profesional.</p>
  </div></body></html>`;
}
const row = (label, value) => (value ? `<tr><td style="padding:6px 12px 6px 0;color:#6E6E73;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:6px 0">${esc(value)}</td></tr>` : "");

export function clientEmail(d) {
  const asesoria = d.tipo === "asesoria";
  const wa = `https://wa.me/${BUSINESS_WA()}?text=${encodeURIComponent(`Hola, tengo una duda sobre mi solicitud ${d.folio}.`)}`;
  const steps = asesoria
    ? ["Te confirmamos por WhatsApp el día y la hora de tu llamada.", "Un abogado define contigo el alcance del contrato.", "Recibes tu cotización antes de empezar."]
    : ["Un abogado revisa tu caso en horario hábil.", "Si aún no pagas, te enviamos tu liga de Mercado Pago (tarjeta, saldo u OXXO).", `Recibes tu contrato en Word y PDF en ${String(d.entrega || "").startsWith("Express") ? "24" : "48"} horas hábiles después de tu pago.`];
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5">Hola ${esc(firstName(d.nombre))}, recibimos tu solicitud. Guarda este folio para cualquier aclaración.</p>
    <p style="margin:0 0 20px"><span style="font-family:Menlo,Consolas,monospace;background:#F5F5F7;border-radius:8px;padding:6px 10px;font-size:15px">${esc(d.folio)}</span></p>
    <table style="border-collapse:collapse;font-size:15px;margin-bottom:20px">
      ${row("Contrato", d.contrato)}${row("Estado", d.estado)}${row(asesoria ? "Horario preferido" : "Entrega", asesoria ? d.horario : d.entrega)}${row("Precio", d.precio)}
    </table>
    <p style="margin:0 0 8px;font-weight:600">Qué sigue</p>
    <ol style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.6">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    <a href="${wa}" style="display:inline-block;background:#128C4A;color:#fff;text-decoration:none;border-radius:980px;padding:12px 22px;font-weight:600">Escribirnos por WhatsApp</a>`;
  return { subject: `Recibimos tu solicitud ${d.folio}`, html: layout(asesoria ? "Tu solicitud de asesoría está registrada" : "Tu solicitud está registrada", body) };
}

export function ownerEmailContent(d, files = []) {
  const wa = mxPhone(d.whatsapp);
  const body = `
    <table style="border-collapse:collapse;font-size:15px;margin-bottom:16px">
      ${row("Folio", d.folio)}${row("Tipo", d.tipo)}${row("Industria", d.industria)}${row("Contrato", d.contrato)}${row("Papel", d.papel)}
      ${row("Persona", d.tipo_persona)}${row("Estado", d.estado)}${row("Entrega", d.entrega)}${row("Horario", d.horario)}${row("Precio", d.precio)}
      ${row("Monto aproximado", d.monto)}${row("Nombre", d.nombre)}${row("Correo", d.email)}${row("WhatsApp", d.whatsapp)}
    </table>
    <p style="margin:0 0 6px;font-weight:600">Caso</p>
    <p style="margin:0 0 16px;white-space:pre-wrap;line-height:1.5;font-size:15px">${esc(d.descripcion)}</p>
    ${files.length ? `<p style="margin:0 0 16px;font-size:14px;color:#6E6E73">Documentos adjuntos a este correo: ${files.map((f) => esc(f.filename)).join(", ")}</p>` : ""}
    ${wa ? `<a href="https://wa.me/${wa}" style="display:inline-block;background:#128C4A;color:#fff;text-decoration:none;border-radius:980px;padding:12px 22px;font-weight:600">Abrir chat con el cliente</a>` : ""}`;
  return { subject: `Nueva solicitud ${d.folio}: ${d.contrato}`, html: layout("Nueva solicitud", body) };
}

/* ---------- Envío de todos los avisos de una solicitud ---------- */
export async function notifyAll(d, files = []) {
  const provider = mailProvider();
  const jobs = [];
  if (provider && isEmail(d.email)) jobs.push(["email", sendEmail({ to: d.email.trim(), replyTo: isEmail(ownerEmail()) ? ownerEmail() : undefined, ...clientEmail(d) })]);
  if (provider && isEmail(ownerEmail())) jobs.push(["owner", sendEmail({ to: ownerEmail(), replyTo: isEmail(d.email) ? d.email.trim() : undefined, attachments: files, ...ownerEmailContent(d, files) })]);
  const to = mxPhone(d.whatsapp);
  if (whatsappReady() && to) jobs.push(["whatsapp", sendWhatsApp(to, [firstName(d.nombre) || "Hola", d.folio || "", d.contrato || "tu contrato"])]);

  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const result = { email: false, owner: false, whatsapp: false, errores: [] };
  settled.forEach((r, i) => {
    const key = jobs[i][0];
    if (r.status === "fulfilled") { result[key] = true; console.log(`Enviado ${key} (${d.folio})`); }
    else { const msg = String(r.reason?.message || r.reason); result.errores.push(`${key}: ${msg}`); console.error(`Falló ${key} (${d.folio}): ${msg}`); }
  });
  return result;
}
