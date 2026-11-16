# Revisión de cuenta y checkout

## Alcance funcional

- Registro e inicio de sesión con correo y contraseña. El nombre y el teléfono son opcionales.
- Verificación por correo y recuperación de contraseña con enlaces de un solo uso.
- Perfil autenticado con dirección, municipio y departamento para futuras compras.
- Checkout autenticado con dirección guardada o nueva; el cliente puede guardar la nueva dirección.
- Compra de invitado sin crear una cuenta. El correo y la dirección, municipio y departamento son obligatorios.
- Pago contra entrega o Web Checkout de Wompi; Sandbox/Producción se separan por configuración y la confirmación depende del webhook firmado, no del retorno del navegador.
- Seguimiento público sin sesión por número de pedido y correo de compra, además de enlaces privados en los correos de confirmación, pago y cambios de estado.

## Arquitectura y protecciones

- NextAuth Credentials autentica; tRPC valida las entradas y Prisma persiste los datos.
- Los tokens de verificación y recuperación se guardan como hash en `VerificationToken`; vencen a las 24 horas y 1 hora, respectivamente.
- Las solicitudes de recuperación usan una respuesta uniforme. Los enlaces se generan desde `APP_URL` y producción requiere HTTPS.
- La entrega de correo usa Brevo mediante HTTP. Se configura con `API_KEY_BREVO` (o `BREVO_API_KEY`), `BREVO_SENDER_EMAIL` y `APP_URL`; `BREVO_SENDER_NAME` es opcional.
- La API vuelve a comprobar usuario verificado, disponibilidad y stock. El pedido, sus líneas, el pago pendiente, la reducción de existencias y el guardado opcional de dirección se ejecutan dentro de una transacción.
- Los enlaces de correo de seguimiento se firman con `AUTH_SECRET`; los enlaces aleatorios existentes continúan validándose mediante su hash guardado. La búsqueda pública por número/correo solo devuelve estado, pago y productos, no dirección ni teléfono.
- Los estados del pedido siguen una secuencia controlada: recibido → preparación → listo para entrega → entregado; se puede cancelar mientras el pedido siga abierto. Los pedidos entregados o cancelados son terminales.
- Al cancelar un pedido se devuelve el stock reservado en la misma transacción. Administración puede marcar como recibido un pago contraentrega pendiente; la actualización envía un correo con seguimiento directo.
- `Order.userId` y la relación a la cuenta son opcionales para conservar pedidos de invitado; municipio y departamento son opcionales en el esquema para compatibilidad con pedidos históricos, pero requeridos por el checkout.
- La migración incremental de direcciones y pedidos de invitado no es una migración inicial. No ejecutar `prisma db push` contra producción; revisar la guía de migraciones antes de cambiar una base persistente.

## Interfaz y correos

- La tienda, navegación, catálogo, páginas de cuenta y checkout usan una identidad floral morada, rosa y dorada, con botones y controles de alto contraste, objetivos táctiles grandes, navegación de carrito accesible y una preferencia de movimiento reducido respetada. El catálogo destaca un producto real cuando hay imagen disponible y el seguimiento indica por separado el estado del pedido y del pago.
- Los correos de verificación y recuperación usan un único botón de acción destacado, un mensaje conciso con saludo y vencimiento, y conservan el enlace absoluto en texto plano para lectores sin formato HTML.

## Operación local

No se leyó ningún secreto, no se conectó a una base de datos real y no se enviaron correos. Para la prueba manual futura, prepara una Preview y una base aislada con Wompi Sandbox, configura el remitente verificado de Brevo y sigue [la guía E2E](prueba-e2e-pedidos.es.md). Las pruebas automatizadas simulan Brevo y no realizan pagos.

## Validación

La suite `npm test` cubre los flujos de cuenta y checkout con base de datos en memoria y correo simulado, además de guías de interfaz. En esta revisión pasaron 15/15 pruebas, `npm run typecheck`, `npm run build` y Prettier para los archivos modificados. El build usó una URL de PostgreSQL local ficticia; no se conectó a una base real ni se enviaron correos.
