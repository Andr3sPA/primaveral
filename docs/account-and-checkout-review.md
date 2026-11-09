# Revisión de cuenta y checkout

## Alcance funcional

- Registro e inicio de sesión con correo y contraseña. El nombre y el teléfono son opcionales.
- Verificación por correo y recuperación de contraseña con enlaces de un solo uso.
- Perfil autenticado con dirección, municipio y departamento para futuras compras.
- Checkout autenticado con dirección guardada o nueva; el cliente puede guardar la nueva dirección.
- Compra de invitado sin crear una cuenta. El correo y la dirección, municipio y departamento son obligatorios.
- Pago contra entrega como única opción activa; no se acepta una tarjeta sin un proveedor de pago implementado.

## Arquitectura y protecciones

- NextAuth Credentials autentica; tRPC valida las entradas y Prisma persiste los datos.
- Los tokens de verificación y recuperación se guardan como hash en `VerificationToken`; vencen a las 24 horas y 1 hora, respectivamente.
- Las solicitudes de recuperación usan una respuesta uniforme. Los enlaces se generan desde `APP_URL` y producción requiere HTTPS.
- La entrega de correo usa Brevo mediante HTTP. Se configura con `API_KEY_BREVO` (o `BREVO_API_KEY`), `BREVO_SENDER_EMAIL` y `APP_URL`; `BREVO_SENDER_NAME` es opcional.
- La API vuelve a comprobar usuario verificado, disponibilidad y stock. El pedido, sus líneas, el pago pendiente, la reducción de existencias y el guardado opcional de dirección se ejecutan dentro de una transacción.
- `Order.userId` y la relación a la cuenta son opcionales para conservar pedidos de invitado; municipio y departamento son opcionales en el esquema para compatibilidad con pedidos históricos, pero requeridos por el checkout.
- La migración incremental de direcciones y pedidos de invitado no es una migración inicial. No ejecutar `prisma db push` contra producción; revisar la guía de migraciones antes de cambiar una base persistente.

## Interfaz y correos

- Las pantallas de registro, inicio de sesión, verificación, recuperación, perfil y checkout comparten un fondo floral sutil con tonos cálidos y salvia. Los controles conservan etiquetas visibles, estados de error y foco accesible.
- Los correos de verificación y recuperación usan un único botón de acción, muestran el dominio y mantienen el enlace absoluto en texto plano, junto con vencimiento y una nota para solicitudes no reconocidas.

## Operación local

No se leyó ningún secreto, no se conectó a una base de datos real y no se enviaron correos. Para validar una entrega real, configura las variables requeridas en un `.env` local ignorado por Git, verifica el remitente en Brevo y usa un destinatario autorizado de prueba. Las pruebas automatizadas simulan Brevo.

## Validación

La suite `npm test` cubre los flujos de cuenta y checkout con base de datos en memoria y correo simulado, además de guías de interfaz. En esta revisión pasaron 15/15 pruebas, `npm run typecheck`, `npm run build` y Prettier para los archivos modificados. El build usó una URL de PostgreSQL local ficticia; no se conectó a una base real ni se enviaron correos.
