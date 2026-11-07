# Revisión e implementación de cuentas y checkout

## Requisitos acordados

- Registro e inicio de sesión con correo y contraseña. El nombre y el teléfono son opcionales.
- Verificación de la cuenta por correo mediante Brevo y recuperación/restablecimiento de contraseña.
- Eliminar el inicio de sesión con GitHub.
- Perfil con dirección, municipio y departamento.
- Checkout autenticado: seleccionar la dirección guardada o introducir otra y, si se desea, guardarla en el perfil.
- Checkout de invitado sin crear cuenta: correo y dirección, municipio y departamento obligatorios.

## Hallazgos de arquitectura

- La aplicación usa NextAuth Credentials, tRPC y Prisma. El registro y la autenticación estaban en `src/server/api/routers/user.ts`; el checkout requería sesión.
- El modelo `VerificationToken` existente permite guardar tokens de verificación y recuperación sin agregar una tabla.
- `Order.userId` era obligatorio, por lo que el esquema impedía persistir pedidos de invitados.
- El perfil solo tenía dirección y teléfono. No había página de perfil, flujos de verificación/recuperación ni flujo de migraciones Prisma en el repositorio; el README describe `prisma db push`.
- No se encontró una suite de pruebas automatizadas configurada.

## Cambios realizados

- El registro acepta únicamente correo y contraseña como obligatorios; persiste nombre/teléfono opcionales y envía un enlace de verificación.
- El acceso rechaza cuentas sin correo verificado. La pantalla de ingreso permite solicitar de nuevo el correo de verificación.
- Se añadieron enlaces con tokens aleatorios de un solo uso, almacenados como hash y con vencimiento, para verificación (24 h) y restablecimiento de contraseña (1 h). Los endpoints de solicitud de restablecimiento usan una respuesta uniforme para no confirmar si existe una cuenta.
- Se retiraron los botones de acceso social no funcionales, incluido GitHub.
- Se añadió el perfil autenticado con teléfono y dirección, municipio y departamento.
- El checkout permite pedidos de invitados y clientes registrados. Los clientes pueden usar la dirección guardada o ingresar otra y elegir si actualizar el perfil. El servidor valida disponibilidad/stock, calcula los totales y crea el pedido dentro de una transacción.
- Los pedidos de invitados guardan correo y nombre opcional; el vínculo a usuario y el teléfono son opcionales. Municipio y departamento son opcionales en el modelo para conservar registros preexistentes, pero obligatorios al crear nuevos pedidos desde el checkout.
- Se añadió la protección de hidratación del carrito para no sobrescribir su contenido guardado mientras se restaura desde `localStorage`.
- Los correos de cuenta tienen un periodo de espera de un minuto para limitar reenvíos; las URLs requieren HTTPS en producción. Los fallos de entrega quedan registrados y el token no enviado se elimina; las respuestas de recuperación se mantienen uniformes para no revelar cuentas.
- Brevo se integra con su API HTTP, sin agregar dependencias. Se configura con `API_KEY_BREVO` o `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` y `APP_URL` o `AUTH_URL`; no se guardan secretos en el repositorio.

## Aplicación local y Brevo

El repositorio no tenía una migración inicial; se agregó una migración incremental para compatibilizar pedidos de invitados, campos de dirección y desvinculación de cuentas. Debe aplicarse a una base que ya tenga el esquema existente. Este trabajo no ejecutó cambios contra ninguna base de datos; para una base local vacía, crea el esquema inicial solo en un entorno aislado.

No había un archivo `.env` en este worktree; solo está `.env.example`. No se leyeron valores de secretos ni se enviaron correos. Para probar entrega real, configura las cuatro variables anteriores en un `.env` local ignorado por Git, usa un remitente verificado en Brevo y un destinatario de prueba autorizado. La verificación automatizada de este cambio debe usar mocks y no enviar mensajes.

## Recomendaciones adicionales (fuera del alcance acordado)

- Agregar limitación de frecuencia para registro, reenvío de verificación y solicitudes de recuperación.
- Evaluar una cola/outbox y monitoreo de entrega para reintentar fallas de Brevo sin perder el contexto de la solicitud.
- Agregar pruebas automatizadas de las rutas de cuenta, concurrencia de tokens y checkout con cliente/invitado cuando el repositorio tenga una infraestructura de pruebas.
- Revisar posteriormente historial de pedidos para clientes y correos transaccionales de confirmación de compra.

## Validación

- `npx prisma format`, `npx prisma validate` y `npx prisma generate`: correctos; la validación usó una URL local ficticia y no abrió conexión a la base de datos.
- `npm run check` (ESLint y TypeScript): correcto con configuración local desechable.
- `npm run build`: correcto; Next.js compiló, pasó lint/tipos y generó las rutas de cuenta y checkout.
- Prettier en los archivos modificados: correcto.
- Smoke test local del build de producción: `/user/signin`, `/user/signup`, `/user/forgot-password`, `/user/resend-verification`, `/user/verify-email`, `/user/reset-password` y `/checkout` respondieron `200`; el perfil anónimo emitió la redirección de streaming a inicio de sesión.
- No existe un comando/suite `test` configurado en `package.json`. No se ejecutó `prisma db push`, no se conectó a una base real y no se probaron envíos de Brevo. Sin `.env` local, no es posible validar el flujo transaccional completo aquí; tampoco se enviaron correos.
