# Pacta · Contratos a la medida

Sitio estático (`index.html`) con funciones de Netlify para guardar solicitudes y enviar avisos automáticos.

## Cómo fluye una solicitud

1. El cliente llena el configurador y presiona **Continuar al pago** o **Solicitar asesoría**.
2. El sitio hace dos cosas al mismo tiempo:
   - guarda la solicitud en **Netlify Forms** (formulario `solicitud`), con hasta 3 archivos (máximo 4 MB en total);
   - llama a `netlify/functions/solicitud.mjs`, que envía al momento:
     - un **correo de confirmación** al cliente con su folio;
     - un **aviso a ti** con todos los datos y los documentos adjuntos;
     - un **WhatsApp automático** al cliente (si está configurado).
3. Si el sitio no está en Netlify o todo falla, el cliente envía su solicitud por WhatsApp con el texto ya escrito.

Los correos ya no dependen de la detección de formularios ni del filtro de spam de Netlify.

**Diagnóstico:** abre `https://TU-SITIO.netlify.app/.netlify/functions/diagnostico` para ver qué falta. Agrega `?enviar=1` para mandarte un correo de prueba.

## 1. Guardar solicitudes (Netlify Forms)

1. Netlify › tu sitio › **Forms** › **Enable form detection**.
2. Vuelve a publicar: **Deploys › Trigger deploy › Deploy site**.
3. En **Forms** aparecerá el formulario **solicitud** con cada solicitud y sus archivos; puedes exportarlas a CSV.

## 2. Correos

### Opción A: Gmail (sin dominio propio, recomendada para empezar)

1. Activa la **verificación en dos pasos** de tu cuenta de Google.
2. Entra a **myaccount.google.com/apppasswords**, crea una contraseña de aplicación llamada "Pacta" y copia los 16 caracteres.
3. En Netlify › **Site configuration › Environment variables** agrega:

| Variable | Valor |
|---|---|
| `GMAIL_USER` | Tu correo de Gmail |
| `GMAIL_APP_PASSWORD` | La contraseña de aplicación de 16 caracteres |
| `OWNER_EMAIL` | Opcional. Dónde recibir los avisos; si no lo pones, llegan a `GMAIL_USER` |

Gmail permite alrededor de 500 correos al día desde una cuenta personal.

### Opción B: Resend (con dominio propio verificado)

Úsala cuando tengas tu dominio. Verifícalo en resend.com › Domains y agrega `RESEND_API_KEY` y `MAIL_FROM` (por ejemplo `Pacta <contratos@tudominio.mx>`). Si existen las variables de Gmail, el sitio usa Gmail; bórralas para usar Resend.

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
