# Primaveral Bordados

Tienda de ropa bordada construida sobre el proyecto base de restaurante. Mantiene Next.js, tRPC, Prisma, NextAuth, Tailwind y los componentes Radix/shadcn existentes, adaptados a catálogo, carrito, pedidos e inventario de prendas.

## Funcionalidades

- Catálogo público con búsqueda, categorías, destacados y detalle de producto.
- Carrito persistente en el navegador con cantidades y control de stock al crear pedidos.
- Checkout preparado para conectar un proveedor de pago; actualmente registra el pedido como pendiente y no almacena datos de tarjeta.
- Autenticación con roles `CLIENT`, `EMPLOYEE` y `ADMIN`.
- Panel administrativo en `/admin` con accesos a inventario, alta de productos, pedidos y métricas.
- Productos con categoría, tallas, colores, imagen, precio, stock y disponibilidad.

## Variables de entorno

Crea `.env` en la raíz y nunca lo subas al repositorio:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="genera-un-secreto-largo-y-aleatorio"
NODE_ENV="development"
```

En Vercel configura las mismas variables para `Production`, `Preview` y `Development`. `DIRECT_URL` ya no es necesaria: Prisma usa `DATABASE_URL` para esta base Neon.

La credencial de Neon compartida durante la configuración debe considerarse expuesta y rotarse antes de desplegar.

## Desarrollo

```bash
npm install
npx prisma db push
npm run dev
```

Validaciones:

```bash
npm run typecheck
npm run build
```

Para administrar productos, crea una cuenta desde `/user/signup` y cambia su rol a `ADMIN` directamente en Neon o mediante el panel de usuarios existente.
