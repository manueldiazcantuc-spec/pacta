# Pacta · Contratos a la medida

Sitio estático (`index.html`) con funciones de Netlify para guardar solicitudes y enviar avisos automáticos.

## Cómo fluye una solicitud

1. El cliente llena el configurador y presiona **Continuar al pago** o **Solicitar asesoría**.
2. El sitio guarda la solicitud en **Netlify Forms** (formulario `solicitud`), con hasta 3 archivos adjuntos (máximo 7 MB en total).
3. Netlify ejecuta `netlify/functions/submission-created.mjs`, que:
   - envía al cliente un **correo de confirmación** con su folio (Resend);
   - te envía un **aviso con todos los datos** y los enlaces a los archivos (Resend);
   - envía al cliente un **WhatsApp automático** con una plantilla aprobada (WhatsApp Cloud API de Meta).
4. Si el sitio no está en Netlify o el guardado falla, el cliente envía su solicitud por WhatsApp con todo el texto ya escrito. Ninguna solicitud se pierde.

Cada canal se activa solo cuando sus variables están configuradas. Puedes activar el correo hoy y el WhatsApp automático después.

## 1. Guardar solicitudes (Netlify Forms)

1. Netlify › tu sitio › **Forms** › **Enable form detection**.
2. Vuelve a publicar: **Deploys › Trigger deploy › Deploy site**.
3. En **Forms** debe aparecer el formulario **solicitud**. Ahí verás cada solicitud, sus archivos y puedes exportarlas a CSV.
4. Opcional: **Forms › Form notifications › Add notification › Email notification** para recibir también el aviso nativo de Netlify.

## 2. Correos (Resend)

1. Crea una cuenta en resend.com y **verifica tu dominio** (Domains › Add domain, y agrega los registros DNS que te indica). Sin dominio verificado, Resend solo permite enviarte correos a ti mismo.
2. Crea una API key (API Keys › Create).
3. En Netlify › **Site configuration › Environment variables** agrega:

| Variable | Ejemplo |
|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxx` |
| `MAIL_FROM` | `Pacta <contratos@tudominio.mx>` (debe ser de tu dominio verificado) |
| `OWNER_EMAIL` | El correo donde quieres recibir cada solicitud |

## 3. WhatsApp automático (WhatsApp Cloud API de Meta)

1. En developers.facebook.com crea una app de tipo **Business** y agrega el producto **WhatsApp**.
2. Registra el número del negocio y copia su **Phone number ID**.
3. Crea un **usuario del sistema** en Business Manager y genera un **token permanente** con el permiso `whatsapp_business_messaging`.
4. En WhatsApp Manager crea una plantilla de categoría **Utility**, idioma **Spanish (MEX)**, por ejemplo `solicitud_recibida`:

   > Hola {{1}}, recibimos tu solicitud {{2}} para {{3}}. Un abogado de Pacta la revisará en horario hábil y te escribiremos por este medio con los siguientes pasos.

   Espera a que el estado sea **Aprobada**.
5. Agrega en Netlify:

| Variable | Valor |
|---|---|
| `WHATSAPP_TOKEN` | Token permanente del usuario del sistema |
| `WHATSAPP_PHONE_ID` | Phone number ID |
| `WHATSAPP_TEMPLATE` | `solicitud_recibida` |
| `WHATSAPP_LANG` | `es_MX` (opcional, es el valor por defecto) |
| `WHATSAPP_API_VERSION` | `v23.0` (opcional) |

Meta cobra cada plantilla enviada según su tarifa vigente para México y necesita un método de pago en la cuenta.

## 4. Después de agregar variables

Vuelve a publicar (**Deploys › Trigger deploy**) para que las funciones tomen las variables. Haz una solicitud de prueba con tu correo y tu WhatsApp. Si algo no llega, revisa **Logs › Functions › submission-created**: ahí aparece qué se envió y qué falló.

## Configuración del sitio

En el bloque `CONFIG` de `index.html`:

| Campo | Qué poner |
|---|---|
| `whatsapp` | Número del negocio: `52` + 10 dígitos. Actual: `525519531324` |
| `email` | Correo de contacto que aparece en el sitio |
| `paymentLinks` | Ligas de Mercado Pago: `base` $949, `base-express` $1,449, `revision` $790, `revision-express` $1,290 |
| `agendaLink` | Opcional. Liga de Calendly o Google Calendar para contratos especializados |

Otras variables opcionales de las funciones: `SITE_NAME` (por defecto `Pacta`) y `BUSINESS_WHATSAPP` (por defecto `525519531324`).
