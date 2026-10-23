// Se ejecuta automáticamente cada vez que Netlify Forms verifica una solicitud nueva.
// 1) Envía al cliente un correo de confirmación (Resend).
// 2) Te envía a ti un aviso con todos los datos (Resend).
// 3) Envía al cliente un WhatsApp con una plantilla aprobada (WhatsApp Cloud API de Meta).
// Cada canal se activa solo cuando sus variables de entorno están configuradas en Netlify.

const env = (key, fallback = "") => (process.env[key] || fallback).trim();
const BRAND = env("SITE_NAME", "Pacta");
const BUSINESS_WA = env("BUSINESS_WHATSAPP", "525519531324");

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const firstName = (v) => String(v || "").trim().split(/\s+/)[0] || "";

// Teléfonos de México en formato internacional para WhatsApp: 52 + 10 dígitos.
function mxPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 10) return "52" + d;
  if (d.length === 12 && d.startsWith("52")) return d;
  if (d.length === 13 && d.startsWith("521")) return "52" + d.slice(3);
  return "";
}

function fileLinks(data) {
  return ["adjunto1", "adjunto2", "adjunto3"]
    .map((k) => data[k])
    .filter((v) => v && typeof v === "object" && v.url)
    .map((v) => ({ url: v.url, name: v.filename || "archivo" }));
}

function layout(title, body) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1D1D1F">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;margin-bottom:20px">${esc(BRAND)}</div>
    <div style="background:#fff;border-radius:18px;padding:28px">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;margin:0 0 16px">${esc(title)}</h1>
      ${body}
    </div>
    <p style="font-size:12px;color:#6E6E73;margin-top:20px;line-height:1.5">${esc(BRAND)} es una plataforma de servicios jurídicos. Los contratos son redactados por abogados independientes con cédula profesional.</p>
  </div></body></html>`;
}

function row(label, value) {
  if (!value) return "";
  return `<tr><td style="padding:6px 12px 6px 0;color:#6E6E73;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:6px 0">${esc(value)}</td></tr>`;
}

function clientEmail(d) {
  const asesoria = d.tipo === "asesoria";
  const wa = `https://wa.me/${BUSINESS_WA}?text=${encodeURIComponent(`Hola, tengo una duda sobre mi solicitud ${d.folio}.`)}`;
  const steps = asesoria
    ? ["Te confirmamos por WhatsApp el día y la hora de tu llamada.", "Un abogado define contigo el alcance del contrato.", "Recibes tu cotización antes de empezar."]
    : ["Un abogado revisa tu caso en horario hábil.", "Si aún no pagas, te enviamos tu liga de Mercado Pago (tarjeta, saldo u OXXO).", `Recibes tu contrato en Word y PDF en ${d.entrega && d.entrega.startsWith("Express") ? "24" : "48"} horas hábiles después de tu pago.`];
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5">Hola ${esc(firstName(d.nombre))}, recibimos tu solicitud. Guarda este folio para cualquier aclaración.</p>
    <p style="margin:0 0 20px"><span style="font-family:Menlo,Consolas,monospace;background:#F5F5F7;border-radius:8px;padding:6px 10px;font-size:15px">${esc(d.folio)}</span></p>
    <table style="border-collapse:collapse;font-size:15px;margin-bottom:20px">
      ${row("Contrato", d.contrato)}${row("Estado", d.estado)}${row(asesoria ? "Horario preferido" : "Entrega", asesoria ? d.horario : d.entrega)}${row("Precio", d.precio)}
    </table>
    <p style="margin:0 0 8px;font-weight:600">Qué sigue</p>
    <ol style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.6">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    <a href="${wa}" style="display:inline-block;background:#128C4A;color:#fff;text-decoration:none;border-radius:980px;padding:12px 22px;font-weight:600">Escribirnos por WhatsApp</a>`;
  return {
    subject: `Recibimos tu solicitud ${d.folio}`,
    html: layout(asesoria ? "Tu solicitud de asesoría está registrada" : "Tu solicitud está registrada", body),
  };
}

function ownerEmail(d, payload) {
  const files = fileLinks(d);
  const wa = mxPhone(d.whatsapp);
  const body = `
    <table style="border-collapse:collapse;font-size:15px;margin-bottom:16px">
      ${row("Folio", d.folio)}${row("Tipo", d.tipo)}${row("Industria", d.industria)}${row("Contrato", d.contrato)}${row("Papel", d.papel)}
      ${row("Persona", d.tipo_persona)}${row("Estado", d.estado)}${row("Entrega", d.entrega)}${row("Horario", d.horario)}${row("Precio", d.precio)}
      ${row("Monto aproximado", d.monto)}${row("Nombre", d.nombre)}${row("Correo", d.email)}${row("WhatsApp", d.whatsapp)}${row("Recibida", payload.created_at)}
    </table>
    <p style="margin:0 0 6px;font-weight:600">Caso</p>
    <p style="margin:0 0 16px;white-space:pre-wrap;line-height:1.5;font-size:15px">${esc(d.descripcion)}</p>
    ${files.length ? `<p style="margin:0 0 6px;font-weight:600">Documentos</p><ul style="margin:0 0 16px;padding-left:20px">${files.map((f) => `<li><a href="${esc(f.url)}">${esc(f.name)}</a></li>`).join("")}</ul>` : ""}
    ${wa ? `<a href="https://wa.me/${wa}" style="display:inline-block;background:#128C4A;color:#fff;text-decoration:none;border-radius:980px;padding:12px 22px;font-weight:600">Abrir chat con el cliente</a>` : ""}`;
  return { subject: `Nueva solicitud ${d.folio}: ${d.contrato}`, html: layout("Nueva solicitud", body) };
}

async function sendEmail({ to, subject, html, replyTo }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("MAIL_FROM"), to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function sendWhatsApp(to, params) {
  const version = env("WHATSAPP_API_VERSION", "v23.0");
  const res = await fetch(`https://graph.facebook.com/${version}/${env("WHATSAPP_PHONE_ID")}/messages`, {
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

export default async (req) => {
  let payload;
  try {
    ({ payload } = await req.json());
  } catch {
    return new Response("Cuerpo inválido", { status: 400 });
  }
  if (!payload || payload.form_name !== "solicitud") return new Response("Formulario ignorado");

  const d = payload.data || {};
  const tasks = [];

  if (env("RESEND_API_KEY") && env("MAIL_FROM")) {
    if (isEmail(d.email)) tasks.push(["correo al cliente", sendEmail({ to: d.email.trim(), replyTo: env("OWNER_EMAIL") || undefined, ...clientEmail(d) })]);
    if (isEmail(env("OWNER_EMAIL"))) tasks.push(["aviso al negocio", sendEmail({ to: env("OWNER_EMAIL"), replyTo: isEmail(d.email) ? d.email.trim() : undefined, ...ownerEmail(d, payload) })]);
  }

  if (env("WHATSAPP_TOKEN") && env("WHATSAPP_PHONE_ID") && env("WHATSAPP_TEMPLATE")) {
    const to = mxPhone(d.whatsapp);
    // Plantilla: {{1}} nombre, {{2}} folio, {{3}} contrato
    if (to) tasks.push(["WhatsApp al cliente", sendWhatsApp(to, [firstName(d.nombre) || "Hola", d.folio || "", d.contrato || "tu contrato"])]);
  }

  const results = await Promise.allSettled(tasks.map(([, p]) => p));
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`Falló ${tasks[i][0]} (${d.folio}):`, r.reason?.message || r.reason);
    else console.log(`Enviado ${tasks[i][0]} (${d.folio})`);
  });
  return new Response("ok");
};
