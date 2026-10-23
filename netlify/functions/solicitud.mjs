// Recibe cada solicitud directamente desde el sitio y envía los avisos al momento:
// correo de confirmación al cliente, aviso con documentos al negocio y WhatsApp automático.
// No depende de la detección de formularios ni del filtro de spam de Netlify Forms.
import { notifyAll } from "../lib/avisos.mjs";

const FIELDS = ["folio", "tipo", "industria", "contrato", "papel", "tipo_persona", "estado", "descripcion", "monto", "entrega", "horario", "precio", "nombre", "email", "whatsapp"];
const MAX_FILE_BYTES = 4.5 * 1024 * 1024;

const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Usa POST" }, 405);

  // Solo se aceptan envíos desde el propio sitio.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return json({ ok: false, error: "Origen no permitido" }, 403);

  let form;
  try { form = await req.formData(); } catch { return json({ ok: false, error: "Formulario inválido" }, 400); }

  // Honeypot: los bots llenan este campo; se responde como si todo saliera bien.
  if (String(form.get("bot-field") || "").trim()) return json({ ok: true, email: false, owner: false, whatsapp: false });

  const d = {};
  for (const k of FIELDS) d[k] = String(form.get(k) || "").slice(0, k === "descripcion" ? 5000 : 300).trim();
  if (!/^PAC-\d{6}-[A-Z0-9]{4}$/.test(d.folio) || !d.nombre || !d.contrato) return json({ ok: false, error: "Faltan datos de la solicitud" }, 400);

  const files = [];
  let total = 0;
  for (const k of ["adjunto1", "adjunto2", "adjunto3"]) {
    const f = form.get(k);
    if (f && typeof f === "object" && "arrayBuffer" in f && f.size > 0) {
      total += f.size;
      if (total > MAX_FILE_BYTES) break;
      files.push({ filename: f.name || k, type: f.type || "application/octet-stream", content: Buffer.from(await f.arrayBuffer()) });
    }
  }

  const result = await notifyAll(d, files);
  return json({ ok: true, email: result.email, owner: result.owner, whatsapp: result.whatsapp });
};
