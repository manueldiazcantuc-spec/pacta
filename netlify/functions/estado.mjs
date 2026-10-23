// Le dice al sitio si está corriendo en Netlify y qué avisos automáticos están activos.
// No expone ninguna clave: solo responde verdadero o falso.
export default async () => {
  const has = (...keys) => keys.every((k) => Boolean((process.env[k] || "").trim()));
  return Response.json(
    {
      netlify: true,
      email: has("RESEND_API_KEY", "MAIL_FROM"),
      whatsapp: has("WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_TEMPLATE"),
    },
    { headers: { "cache-control": "no-store" } }
  );
};
