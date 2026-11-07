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
- Autenticación con roles `CLIENT`, `EMPLOYEE` y `ADMIN`, verificación de correo y restablecimiento de contraseña.
- Perfil de cliente con teléfono y dirección guardados; el checkout también acepta pedidos de invitados.
- Panel administrativo en `/admin` con accesos a inventario, alta de productos, pedidos y métricas.
- Productos con categoría, tallas, colores, imagen, precio, stock y disponibilidad.
- Cada producto puede marcarse como `Envío inmediato` o `Traer por encargo`, con un plazo estimado en días visible en la ficha, bolsa y checkout.

## Variables de entorno

Crea `.env` en la raíz y nunca lo subas al repositorio:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/primaveral_dev"
AUTH_SECRET="genera-un-secreto-largo-y-aleatorio"
AUTH_URL="http://localhost:3000"
CLOUDINARY_URL="cloudinary://api-key:api-secret@cloud-name"
API_KEY_BREVO="tu-api-key-de-brevo"
BREVO_SENDER_EMAIL="remitente-verificado@example.com"
BREVO_SENDER_NAME="Primaveral Bordados"
NODE_ENV="development"
```

En Vercel configura `DATABASE_URL`, `AUTH_SECRET` y `CLOUDINARY_URL` para
`Production`, `Preview` y `Development`. Para el correo de cuenta configura
`API_KEY_BREVO` y un `BREVO_SENDER_EMAIL` verificado en Brevo;
`BREVO_SENDER_NAME` es opcional. En producción, configura `AUTH_URL` con el
origen HTTPS público de la aplicación (Vercel puede usar `VERCEL_URL` como
respaldo). La integración de Prisma puede crear también `PRISMA_DATABASE_URL`,
`POSTGRES_URL` y `DATABASE_URL_POOLED`; no es necesario usarlas en el código
actual. `DIRECT_URL` no es necesaria.

Las imágenes del panel administrativo se suben mediante `/api/upload`, pasan
por Cloudinary en el servidor y solo se guarda en Neon la URL `secure_url`.
Nunca se suben credenciales al navegador ni se guardan imágenes dentro del
repositorio. El endpoint acepta únicamente JPG, PNG y WebP de hasta 8 MB.

La credencial de Neon compartida durante la configuración debe considerarse
expuesta y rotarse antes de desplegar.

Los enlaces de verificación vencen en 24 horas y los de restablecimiento en una
hora; ambos son de un solo uso y solo se conserva su hash en `VerificationToken`.
El endpoint de restablecimiento responde igual exista o no la cuenta. El inicio
de sesión y el checkout registrado requieren un correo verificado.

El checkout de invitados agrega `guestName` y `guestEmail` a `Order` y permite
`userId` nulo. Este repositorio aún no tiene una migración inicial del esquema:
aplica la migración incremental de `prisma/migrations` en una base de pruebas
antes de desplegar el cambio. Para crear una base vacía, usa `prisma db push`
solo en un entorno aislado. No ejecutes `db push` contra producción ni incluyas
la migración de base de datos en el paso de build de Vercel sin una aprobación
y un despliegue de esquema revisados.

## Desarrollo

```bash
npm install
npx prisma db push
npm run dev
```

Antes de ejecutar `db push`, confirma que `DATABASE_URL` apunta a una base
local/de pruebas aislada, nunca a producción.

Cuando se agreguen cambios al modelo, aplica primero el esquema en una base de
desarrollo o pruebas aislada. No apuntes `npx prisma db push` a producción. Los
productos existentes quedan configurados por defecto como `READY_TO_SHIP` con
`0` días adicionales.

La comprobación de cuenta debe cubrir registro y correo no verificado, consumo
único de enlaces de verificación y restablecimiento, acceso al perfil, y pedidos
registrados e invitados. Valida primero Brevo con un mock o un buzón de prueba
confirmado; no uses direcciones de clientes ni la base de producción para estas
pruebas. El build no aplica cambios al esquema de base de datos.

Validaciones:

```bash
npm run typecheck
npm run build
```

Para administrar productos, crea una cuenta desde `/user/signup` y cambia su
rol a `ADMIN` directamente en Neon o mediante el panel de usuarios existente.
