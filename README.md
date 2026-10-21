# Pacta · Contratos a la medida

Sitio estático (un solo `index.html`) para vender contratos revisados por abogados en México.

## Configuración antes de lanzar

Todo se cambia en el bloque `CONFIG` al inicio del `<script>` de `index.html`:

| Campo | Qué poner |
|---|---|
| `whatsapp` | Número del negocio: `52` + 10 dígitos, sin espacios. Actual: `525519531324` |
| `email` | Correo de contacto |
| `paymentLinks` | Ligas de pago de Mercado Pago (Tu negocio › Link de pago): `base` $949, `base-express` $1,449, `revision` $790, `revision-express` $1,290. Aceptan tarjeta, saldo de Mercado Pago y efectivo en OXXO |
| `agendaLink` | Opcional. Liga de Calendly o Google Calendar para agendar contratos especializados. Si está vacía, se agendan por WhatsApp |
| `formEndpoint` | Opcional. URL de Formspree/Basin para recibir solicitudes por correo. Si está vacío, el cliente envía su solicitud por WhatsApp |

Precios: objeto `TIERS`. Todos los contratos del catálogo cuestan $949 (`base`); los especializados (`especial`) se agendan por WhatsApp o por `agendaLink`. Revisión de contrato: $790. Express: +$500 (`expressExtra`).

## Publicación

**Netlify (recomendado):** app.netlify.com › Add new site › Import an existing project › GitHub › `pacta`.
La configuración ya está en `netlify.toml`; no hay comando de build. Cada cambio que se sube a `main` se publica solo.

**GitHub Pages (alternativa):** Settings › Pages › Deploy from a branch › `main` / root.
