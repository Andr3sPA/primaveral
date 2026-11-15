# Primaveral Bordados

Tienda de ropa bordada construida sobre el proyecto base de restaurante. Mantiene Next.js, tRPC, Prisma, NextAuth, Tailwind y los componentes Radix/shadcn existentes, adaptados a catálogo, carrito, pedidos e inventario de prendas.

## Stack tecnológico

- **Framework web:** Next.js 15 con React 19 y TypeScript.
- **API y consultas:** tRPC 11, usado para definir routers/procedures tipados y consumirlos desde React Query; el endpoint está expuesto en `/api/trpc`.
- **Base de datos y ORM:** PostgreSQL sobre Neon, accedida mediante Prisma 6 y `@prisma/client`.
- **Autenticación:** NextAuth 5 con `@auth/prisma-adapter` para persistir usuarios, cuentas y sesiones en Prisma.
- **Despliegue:** Vercel, con `DATABASE_URL`, `AUTH_SECRET` y `CLOUDINARY_URL` configuradas por entorno.
- **Interfaz:** Tailwind CSS, componentes Radix UI y utilidades de shadcn/ui.
- **Imágenes:** Cloudinary para la carga y entrega de imágenes de productos.

## Funcionalidades

- Catálogo público con búsqueda, categorías, destacados y detalle de producto.
- Identidad visual floral con navegación adaptable, catálogo accesible y enlaces de contacto.
- Carrito persistente en el navegador con cantidades y control de stock al crear pedidos.
- Checkout preparado para conectar un proveedor de pago; actualmente registra el pedido como pendiente y no almacena datos de tarjeta.
- Registro e inicio de sesión con correo y contraseña, verificación de cuenta y recuperación de contraseña mediante Brevo.
- Perfil con nombre/teléfono opcionales y dirección guardada con municipio y departamento; el checkout permite comprar autenticado o como invitado.
- Autenticación con roles `CLIENT`, `EMPLOYEE` y `ADMIN`; no hay acceso social con GitHub.
- Panel administrativo en `/admin` con accesos a inventario, alta de productos, pedidos y métricas.
- Productos con categoría, tallas, colores, imagen, precio, stock y disponibilidad.
- Cada producto puede marcarse como `Envío inmediato` o `Traer por encargo`, con un plazo estimado en días visible en la ficha, bolsa y checkout.

## Variables de entorno

Crea `.env` en la raíz y nunca lo subas al repositorio:

Para activar la verificación y recuperación por correo, configura
`API_KEY_BREVO` (también se acepta `BREVO_API_KEY`),
`BREVO_SENDER_EMAIL` (remitente verificado), `BREVO_SENDER_NAME` y `APP_URL`.
`APP_URL` debe ser el origen público canónico de la aplicación (por ejemplo,
`https://www.tudominio.com`), sin ruta, query ni fragmento. Los enlaces de
verificación y recuperación siempre se generan desde esa variable y apuntan a
`/user/verify-email` o `/user/reset-password`; no se infieren del dominio de la
solicitud ni de `VERCEL_URL`, `AUTH_URL` o `NEXTAUTH_URL`. En producción debe
usar HTTPS. Define un `APP_URL` explícito en cada entorno de Vercel y no uses la
URL efímera de una Preview como dirección de correo. El mensaje HTML presenta
un botón claro y no muestra la URL larga; la versión de texto incluye el enlace
directo para que también pueda abrirse desde lectores sin formato HTML.

La aplicación envía a Brevo el enlace directo a `APP_URL` y no configura
seguimiento de clics en la solicitud. No podemos ver desde el código si el
seguimiento está activado en la cuenta de Brevo. Si el enlace recibido pasa por
`sendibt2.com`, revisa en el panel de Brevo la opción de seguimiento de clics y
desactívala si quieres conservar el destino directo; después, envía un correo de
prueba y comprueba el enlace del botón. Si el destino final es una URL de
Preview de Vercel, corrige `APP_URL` en las variables del entorno de producción:
la aplicación nunca usa `VERCEL_URL` para crear enlaces de cuenta.

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="genera-un-secreto-largo-y-aleatorio"
CLOUDINARY_URL="cloudinary://api-key:api-secret@cloud-name"
NODE_ENV="development"
```

En Vercel configura `DATABASE_URL`, `AUTH_SECRET` y `CLOUDINARY_URL` para
`Production`, `Preview` y `Development`. La integración de Prisma puede crear
también `PRISMA_DATABASE_URL`, `POSTGRES_URL` y `DATABASE_URL_POOLED`; no es
necesario usarlas en el código actual. `DATABASE_URL` debe apuntar a la base
Neon que usa este proyecto. `DIRECT_URL` no es necesaria.

Las imágenes del panel administrativo se suben mediante `/api/upload`, pasan
por Cloudinary en el servidor y solo se guarda en Neon la URL `secure_url`.
Nunca se suben credenciales al navegador ni se guardan imágenes dentro del
repositorio. El endpoint acepta únicamente JPG, PNG y WebP de hasta 8 MB.

### Publicación automática en Facebook e Instagram

La publicación automática se configura desde `/admin/social` y permanece
desactivada hasta que un administrador la habilite por plataforma. Cada
producto se publica siempre en la página web y puede optar por Facebook,
Instagram, ambas redes o ninguna mediante opciones independientes, desactivadas
por defecto. Solo se encola al crear un producto elegible, en su primera
transición a disponible con stock, o al activar explícitamente un canal. Las
ediciones normales no crean trabajos y activar una plataforma no hace backfill
de productos sin opt-in. Desactivar un canal cancela solo los trabajos de ese
canal que aún no comenzaron; cada plataforma conserva su propio estado. La cola
se procesa mediante el workflow
`.github/workflows/social-publications.yml` de GitHub Actions, que llama al
endpoint protegido cada cinco minutos (en los minutos 3, 8, ..., 58 UTC). El
workflow usa el environment `prod`; debe estar en la rama predeterminada para
que se ejecuten sus schedules. GitHub puede retrasar ejecuciones programadas
durante periodos de alta carga, por lo que no se garantiza una hora exacta.
Esto evita el límite de cron diario de Vercel Hobby; si se vuelve a configurar
este schedule como Vercel Cron, se requiere un plan Pro o Enterprise según la
[documentación de Vercel](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing).
La creación del producto solo guarda el producto y encola sus trabajos en la
base de datos; no espera a Meta ni al worker. La ejecución manual de
`workflow_dispatch` también procesa publicaciones reales.

Se evaluó disparar el worker con Next.js `after()` desde el Route Handler de
tRPC (`src/app/api/trpc/[trpc]/route.ts`). Aunque `after()` está disponible en
la versión instalada y puede ejecutar trabajo post-respuesta, sigue limitado
por `maxDuration` de la función y no es un scheduler durable. El worker de
Instagram crea el contenedor y lo deja en `WAITING_FOR_MEDIA` para volver a
consultarlo cinco minutos después. El Route Handler de tRPC no fija
`maxDuration`; el máximo actual de Vercel Hobby es 300 segundos, el mismo
intervalo que espera el worker. Esperar ese periodo dentro de `after()` deja sin
margen para consultar y publicar el contenedor, y la ejecución puede terminar
por límite de duración. Por eso `after()` no sustituye al workflow programado
de GitHub Actions como mecanismo para recuperar la cola en ejecuciones
posteriores. Consulta la documentación de
[Next.js `after()`](https://nextjs.org/docs/15/app/api-reference/functions/after)
y los [límites de duración de Vercel](https://vercel.com/docs/functions/limitations#max-duration).

Configura estas variables en el entorno **del servidor** de Vercel Production
(y en un entorno Meta de prueba independiente si vas a validar Preview).
Además, configura `APP_URL` como variable y `CRON_SECRET` como secret en el
GitHub Environment `prod`, que usa el workflow del worker. En Vercel
Production, `CRON_SECRET` tiene que ser exactamente el mismo valor que ese
secret de GitHub. En Vercel, abre **Project Settings → Environment Variables**,
añade o actualiza `CRON_SECRET` para el entorno **Production** usando el valor
ya guardado en **GitHub → Settings → Environments → prod → Environment
secrets**, guarda y vuelve a desplegar la última versión de Production. No hace
falta copiar ni mostrar el valor en registros. Si falta en Vercel,
`GET /api/cron/social-publications` responde 503.

```env
APP_URL="https://www.tudominio.com"
CRON_SECRET="secreto-aleatorio-de-al-menos-32-caracteres"
META_PAGE_ID="id-de-la-pagina"
META_INSTAGRAM_USER_ID="id-de-la-cuenta-profesional"
META_PAGE_ACCESS_TOKEN="token-de-acceso-de-la-pagina"
META_GRAPH_API_VERSION="v27.0"
```

`META_PAGE_ACCESS_TOKEN` es una credencial; nunca la incluyas en código,
variables `NEXT_PUBLIC_*`, registros, capturas ni tickets. El proyecto no
implementa el inicio de sesión/renovación de tokens de Meta: la persona
administradora debe provisionar un Page access token vigente y renovarlo por el
proceso autorizado de Meta. La aplicación no promete renovar automáticamente
los tokens.

Los nombres `META_APP_ID`, `META_APP_SECRET`, `META_USER_TOKEN` y
`META_APP_TOKEN` se reconocen únicamente como variables de servidor de la
configuración Meta existente y no se usan para publicar. El publicador consume
un Page access token via `META_PAGE_ACCESS_TOKEN`. Si esa variable no está
definida, se acepta `META_ACCESS_TOKEN` como alias compatible del mismo token
de Página (no como token de usuario ni de aplicación). Prefiere el nombre
explícito `META_PAGE_ACCESS_TOKEN` en entornos nuevos. No copies valores desde
un `.env` al repositorio.

El Page ID confirmado en la solicitud original es `1770849856475843`; asígnalo
a `META_PAGE_ID` en el entorno de servidor, no en código. La cuenta profesional
conectada confirmada es `bordadosdecartagoenmedellin`
(`17841403402083219`); asígnala a `META_INSTAGRAM_USER_ID` en el entorno de
servidor. La aplicación no consulta ni intercambia los tokens automáticamente.

La publicación en Pages requiere los permisos y tareas que correspondan a la
cuenta y al método de inicio de sesión; revisa `pages_manage_posts`,
`pages_manage_engagement`, `pages_read_engagement` y
`pages_read_user_engagement`, además de que quien autoriza el token tenga la
tarea `CREATE_CONTENT` o `MANAGE` en la Página. Para Instagram con Facebook
Login se requieren una cuenta profesional conectada a esa Página, un Page
access token, `instagram_basic`, `instagram_content_publish` y
`pages_read_engagement`. Meta puede requerir `ads_management` y `ads_read` para
roles asignados mediante Business Manager, Page Publishing Authorization
(PPA), App Review/Advanced Access o Business Verification. Confirma los
requisitos vigentes en el panel Meta; probar con una app en Development no
demuestra acceso de producción.

Referencias: [Pages API - Posts](https://developers.facebook.com/documentation/pages-api/posts),
[Instagram Content Publishing](https://developers.facebook.com/documentation/instagram-platform/content-publishing)
y [Graph API changelog](https://developers.facebook.com/documentation/development/graph-api/changelog/).
La versión configurada por defecto es `v27.0`; revisa el changelog antes de
cambiarla o actualizarla.

Facebook publica fotos mediante `/{page-id}/photos` con `caption`, o posts de
texto/enlace mediante `/{page-id}/feed` con `message` ([Page Photos](https://developers.facebook.com/docs/graph-api/reference/page/photos/)).
Instagram crea un
media container usando una URL JPEG pública (las imágenes Cloudinary se
transforman a JPEG), consulta su estado y solo después lo publica. En Instagram,
el link de WhatsApp del caption puede no ser clicable; el footer de la tienda y
la página del producto ofrecen el enlace directo al chat:
`https://api.whatsapp.com/message/L4SSJI6CVEXJL1?autoload=1&app_absent=0`.
La [referencia del endpoint `media_publish`](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media_publish)
documenta un límite de 50 publicaciones por cuenta en una ventana móvil de 24
horas; Meta puede rechazar publicaciones por límites, permisos o PPA.

Los intentos quedan persistidos por plataforma. Se reintentan errores
transitorios de límite de solicitudes; si Meta no confirma el resultado de una
publicación, el panel la deja en revisión y bloquea el reintento automático para
evitar duplicados. Un administrador debe revisar la publicación en Meta y
confirmar que no existe antes de pedir un reintento manual.
Las credenciales no son necesarias para compilar ni ejecutar las pruebas
mockeadas.

La credencial de Neon compartida durante la configuración debe considerarse expuesta y rotarse antes de desplegar.

## Desarrollo y despliegue

```bash
npm install
npm run db:push
npm run dev
```

`npm run db:push` sirve solo para crear o sincronizar una base local aislada;
nunca lo ejecutes contra producción. El repositorio aún no tiene una
migración inicial: las migraciones existentes son incrementales. El
comando `vercel-build` solo compila y nunca modifica la base de datos. Antes de
ejecutar `npm run db:migrate` contra Neon, sigue la guía de [baseline y
migraciones de Prisma](docs/prisma-neon-migrations.es.md), que exige respaldo,
comparación del esquema y un baseline explícito. Usa una base separada para
Preview y valida allí las migraciones primero.

El inicio de sesión y los pedidos autenticados requieren un correo verificado.
Los enlaces de verificación vencen en 24 horas y los de restablecimiento en una
hora; ambos son de un solo uso y solo se conserva su hash en `VerificationToken`.
Las solicitudes repetidas de correo tienen un periodo mínimo de espera de un
minuto. El endpoint de recuperación no revela si existe la cuenta.

Validaciones:

```bash
npm run typecheck
npm run build
```

Para administrar productos, crea una cuenta desde `/user/signup` y cambia su rol a `ADMIN` directamente en Neon o mediante el panel de usuarios existente.
