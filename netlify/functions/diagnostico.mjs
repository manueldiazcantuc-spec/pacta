// Diagnóstico de los avisos automáticos. No muestra claves, solo si existen.
// Abrir:  /.netlify/functions/diagnostico
// Prueba: /.netlify/functions/diagnostico?enviar=1  → envía un correo de prueba SOLO al correo del negocio.
import { env, isEmail, mailProvider, ownerEmail, sendEmail, verifyGmail, whatsappReady } from "../lib/avisos.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const provider = mailProvider();
  const out = {
    correo: {
      proveedor: provider || "ninguno",
      GMAIL_USER: env("GMAIL_USER") || null,
      GMAIL_APP_PASSWORD: Boolean(env("GMAIL_APP_PASSWORD")),
      RESEND_API_KEY: Boolean(env("RESEND_API_KEY")),
      MAIL_FROM: env("MAIL_FROM") || null,
      avisos_a: ownerEmail() || null,
    },
    whatsapp: {
      listo: whatsappReady(),
      WHATSAPP_TOKEN: Boolean(env("WHATSAPP_TOKEN")),
      WHATSAPP_PHONE_ID: Boolean(env("WHATSAPP_PHONE_ID")),
      WHATSAPP_TEMPLATE: env("WHATSAPP_TEMPLATE") || null,
    },
    problemas: [],
  };

  if (!provider) {
    out.problemas.push("No hay forma de enviar correos. La más fácil: agrega GMAIL_USER (tu Gmail) y GMAIL_APP_PASSWORD (contraseña de aplicación de Google) en Netlify › Site configuration › Environment variables, y vuelve a publicar.");
    if (env("GMAIL_USER") && !env("GMAIL_APP_PASSWORD")) out.problemas.push("Tienes GMAIL_USER pero falta GMAIL_APP_PASSWORD.");
    if (env("RESEND_API_KEY") && !env("MAIL_FROM")) out.problemas.push("Tienes RESEND_API_KEY pero falta MAIL_FROM.");
  }
  if (!isEmail(ownerEmail())) out.problemas.push("Falta el correo donde recibes los avisos: agrega OWNER_EMAIL (o usa GMAIL_USER).");

  if (provider === "gmail") {
    try { await verifyGmail(); out.correo.conexion = "Gmail aceptó el usuario y la contraseña de aplicación."; }
    catch (e) {
      out.correo.conexion = String(e.message || e);
      out.problemas.push("Gmail rechazó el acceso. Usa una contraseña de aplicación (no tu contraseña normal) creada en myaccount.google.com/apppasswords; requiere tener activa la verificación en dos pasos.");
    }
  }

  if (provider === "resend") {
    const from = env("MAIL_FROM");
    const domain = ((from.match(/<([^>]+)>/) || [, from])[1].split("@")[1] || "").toLowerCase();
    try {
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}` } });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const doms = (j.data || []).map((d) => ({ dominio: d.name, estado: d.status }));
        out.correo.dominios_resend = doms;
        const m = doms.find((d) => d.dominio.toLowerCase() === domain);
        if (domain === "resend.dev") out.problemas.push("MAIL_FROM usa resend.dev: Resend solo envía a tu propio correo. Verifica un dominio o usa Gmail.");
        else if (!m) out.problemas.push(`El dominio de MAIL_FROM (${domain || "vacío"}) no está en Resend › Domains.`);
        else if (m.estado !== "verified") out.problemas.push(`El dominio ${m.dominio} está "${m.estado}" en Resend: faltan los registros DNS.`);
      } else if (r.status === 401) out.problemas.push("Resend rechazó RESEND_API_KEY. Crea una nueva clave.");
    } catch (e) { out.correo.error = String(e.message || e); }
  }

  if (url.searchParams.get("enviar") === "1") {
    if (!provider || !isEmail(ownerEmail())) out.prueba = "No se envió: revisa la lista de problemas.";
    else {
      try {
        await sendEmail({ to: ownerEmail(), subject: "Prueba de correo de Pacta", html: "<p>Si lees esto, los correos automáticos de tu sitio funcionan.</p>" });
        out.prueba = `Enviado a ${ownerEmail()}. Si no lo ves, revisa la carpeta de spam.`;
      } catch (e) { out.prueba = `Falló: ${String(e.message || e)}`; }
    }
  }

  out.listo = out.problemas.length === 0;
  return Response.json(out, { headers: { "cache-control": "no-store" } });
};
