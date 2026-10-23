// Le dice al sitio si está corriendo en Netlify y qué avisos automáticos están activos.
// No expone ninguna clave: solo responde verdadero o falso.
import { mailProvider, whatsappReady } from "../lib/avisos.mjs";

export default async () =>
  Response.json(
    { netlify: true, email: Boolean(mailProvider()), whatsapp: whatsappReady() },
    { headers: { "cache-control": "no-store" } }
  );
