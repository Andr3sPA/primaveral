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

La credencial de Neon compartida durante la configuración debe considerarse expuesta y rotarse antes de desplegar.

## Desarrollo y despliegue

```bash
npm install
npm run db:push
npm run dev
```

`npm run db:push` sirve solo para crear o sincronizar una base local aislada;
nunca lo ejecutes contra producción. El repositorio aún no tiene una
migración inicial: las dos migraciones existentes son incrementales. El
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
