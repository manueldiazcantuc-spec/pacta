# Pacta · Contratos a la medida

Sitio estático (un solo `index.html`) para vender contratos revisados por abogados en México.

## Configuración antes de lanzar

Todo se cambia en el bloque `CONFIG` al inicio del `<script>` de `index.html`:

| Campo | Qué poner |
|---|---|
| `whatsapp` | Número del negocio: `52` + 10 dígitos, sin espacios. Actual: `525519531324` |
| `email` | Correo de contacto |
| `paymentLinks` | Ligas de pago de Mercado Pago (Tu negocio › Link de pago), una por precio. Aceptan tarjeta, saldo de Mercado Pago y efectivo en OXXO |
| `formEndpoint` | Opcional. URL de Formspree/Basin para recibir solicitudes por correo. Si está vacío, el cliente envía su solicitud por WhatsApp |

Precios: objeto `TIERS` (Esencial $990, Estándar $1,990, Especializado $3,490, Complejo $5,990). Express = +50%.

## Publicación

**Netlify (recomendado):** app.netlify.com › Add new site › Import an existing project › GitHub › `pacta`.
La configuración ya está en `netlify.toml`; no hay comando de build. Cada cambio que se sube a `main` se publica solo.

**GitHub Pages (alternativa):** Settings › Pages › Deploy from a branch › `main` / root.
