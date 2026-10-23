// Diagnóstico de los avisos automáticos. No muestra claves, solo si existen.
// Abrir:  /.netlify/functions/diagnostico
// Prueba: /.netlify/functions/diagnostico?enviar=1  → envía un correo de prueba SOLO a OWNER_EMAIL.
const env = (k) => (process.env[k] || "").trim();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default async (req) => {
  const url = new URL(req.url);
  const from = env("MAIL_FROM");
  const fromAddr = (from.match(/<([^>]+)>/) || [, from])[1].trim();
  const fromDomain = fromAddr.includes("@") ? fromAddr.split("@")[1].toLowerCase() : "";
  const out = {
    variables: {
      RESEND_API_KEY: Boolean(env("RESEND_API_KEY")),
      MAIL_FROM: from || null,
      OWNER_EMAIL: env("OWNER_EMAIL") || null,
      WHATSAPP_TOKEN: Boolean(env("WHATSAPP_TOKEN")),
      WHATSAPP_PHONE_ID: Boolean(env("WHATSAPP_PHONE_ID")),
      WHATSAPP_TEMPLATE: env("WHATSAPP_TEMPLATE") || null,
    },
    problemas: [],
  };

  if (!out.variables.RESEND_API_KEY) out.problemas.push("Falta RESEND_API_KEY en Netlify › Site configuration › Environment variables.");
  if (!from) out.problemas.push("Falta MAIL_FROM, por ejemplo: Pacta <contratos@tudominio.mx>.");
  else if (!isEmail(fromAddr)) out.problemas.push(`MAIL_FROM no tiene un correo válido: "${from}".`);
  if (!isEmail(env("OWNER_EMAIL"))) out.problemas.push("Falta OWNER_EMAIL (o no es un correo válido): ahí llega el aviso de cada solicitud.");

  if (out.variables.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}` } });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 || r.status === 403) {
        out.resend = { error: j.message || `HTTP ${r.status}` };
        if (/restricted|sending/i.test(j.message || "")) out.resend.nota = "La clave es de solo envío; no puedo listar dominios, pero sí enviar. Usa ?enviar=1 para probar.";
        else out.problemas.push("Resend rechazó la clave RESEND_API_KEY. Crea una nueva en resend.com › API Keys y reemplázala.");
      } else {
        const domains = (j.data || []).map((d) => ({ dominio: d.name, estado: d.status }));
        out.resend = { dominios: domains };
        const match = domains.find((d) => d.dominio.toLowerCase() === fromDomain);
        if (fromDomain === "resend.dev") out.problemas.push("MAIL_FROM usa resend.dev: Resend solo deja enviar a tu propio correo. Verifica tu dominio y usa un remitente de ese dominio.");
        else if (!match) out.problemas.push(`El dominio de MAIL_FROM (${fromDomain || "vacío"}) no está agregado en Resend › Domains.`);
        else if (match.estado !== "verified") out.problemas.push(`El dominio ${match.dominio} está en estado "${match.estado}" en Resend. Faltan los registros DNS para verificarlo.`);
      }
    } catch (e) {
      out.resend = { error: String(e.message || e) };
    }
  }

  if (url.searchParams.get("enviar") === "1") {
    if (!out.variables.RESEND_API_KEY || !isEmail(fromAddr) || !isEmail(env("OWNER_EMAIL"))) {
      out.prueba = "No se envió: faltan variables (ver problemas).";
    } else {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [env("OWNER_EMAIL")], subject: "Prueba de correo de Pacta", html: "<p>Si lees esto, los correos automáticos funcionan.</p>" }),
      });
      const t = await r.text();
      out.prueba = r.ok ? `Enviado a ${env("OWNER_EMAIL")}. Revisa también la carpeta de spam.` : `Resend respondió ${r.status}: ${t}`;
    }
  }

  out.listo = out.problemas.length === 0;
  return Response.json(out, { headers: { "cache-control": "no-store" } });
};
