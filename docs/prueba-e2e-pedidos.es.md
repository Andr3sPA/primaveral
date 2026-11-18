# Prueba futura del flujo completo de pedidos

Esta guía es para ejecutar una prueba manual otro día, en un entorno aislado
configurado con **Wompi Sandbox**. No hagas pagos reales ni uses llaves de
Producción. Esta prueba no se ha ejecutado desde esta sesión.

## 1. Preparar un entorno seguro

1. Elige una Preview HTTPS y una base de datos de prueba separada de Producción.
   Confirma en el panel del proveedor cuál es el entorno activo antes de tocar
   variables o aplicar migraciones. No uses `db:push` contra una base persistente.
2. Comprueba que las migraciones versionadas estén aplicadas a esa base aislada.
   Si vas a aplicar migraciones, verifica dos veces el destino de `DATABASE_URL`
   y sigue `docs/prisma-neon-migrations.es.md`; nunca apuntes este paso a la base
   de Producción.
3. En Vercel, configura `WOMPI_REDIRECT_URL` en **Settings → Environment
   Variables** para el entorno que sirve la Preview elegida (normalmente
   **Preview**, no Production), con el valor exacto
   `https://<preview>/checkout/resultado`. Después de cambiar variables,
   vuelve a desplegar esa Preview para que las tome. La configuración actual de
   Production/live no se ha verificado ni se debe dar por lista.
4. Configura únicamente credenciales Sandbox de Wompi:
   `WOMPI_LLAVE_PUBLICA` con prefijo `pub_test_`, `WOMPI_LLAVE_PRIVADA`
   con `prv_test_`, `WOMPI_EVENTOS` con
   `test_events_`, y `WOMPI_INTEGRIDAD` con `test_integrity_`, en el mismo
   entorno Vercel de la Preview. No habilites pagos reales. No copies secretos
   en chats, capturas, comandos o registros.
5. Mantén `AUTH_SECRET` configurado y estable durante toda la prueba. Configura
   `APP_URL` con el origen HTTPS canónico de esa Preview, sin ruta,
   query ni fragmento. Configura `API_KEY_BREVO` (o `BREVO_API_KEY`) y un
   `BREVO_SENDER_EMAIL` verificado para las pruebas. Comprueba que el botón del
   correo conserve como destino la Preview; si Brevo reescribe los clics,
   desactiva el seguimiento de clics para esta prueba.
6. En el Dashboard **Sandbox** de Wompi, registra
   `https://<preview>/api/wompi/events` y el evento `transaction.updated`.
   Comprueba que la llave pública, el secreto de eventos y el de integridad
   pertenecen al mismo ambiente Sandbox.
7. Prepara un producto disponible con stock, imagen real, precio de prueba y
   plazo de entrega definido. El total que muestra el checkout es el de los
   productos: el costo de envío no está incluido y debe confirmarse antes de
   despachar. Ten una cuenta administradora verificada para cambiar estados.

**Detente** si el checkout muestra “Producción”, si el destino no es la Preview,
si Wompi no está en Sandbox o si no puedes confirmar que la base es de prueba.
No ingreses datos de tarjetas reales. Usa únicamente los datos vigentes de la
[documentación de pruebas de Wompi](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/).

## 2. Compra de invitado con pago aprobado

1. Abre la tienda sin iniciar sesión, busca el producto y revisa su imagen,
   precio, disponibilidad y plazo estimado.
2. Agrégalo al carrito. Confirma la cantidad, el subtotal y la nota sobre el
   costo de envío. Finaliza como invitado con un correo que puedas consultar y
   una dirección completa.
3. Antes de continuar, confirma que el checkout ofrece **Tarjeta o PSE con
   Wompi Sandbox (pruebas)** habilitado y que no muestra un aviso de Wompi
   deshabilitado ni variables faltantes. Si aparece, por ejemplo, que falta
   `WOMPI_REDIRECT_URL`, detente: verifica la variable en el entorno Vercel de
   esa Preview, vuelve a desplegarla y recarga el checkout. **Pago al recibir**
   puede seguir disponible, pero no sirve para validar Wompi.
4. Selecciona **Tarjeta o PSE con Wompi Sandbox (pruebas)**. El botón debe decir
   **Preparar pedido y continuar al pago**. Continúa al checkout hospedado de
   Wompi Sandbox y usa allí un método de prueba aprobado de su documentación.
5. Confirma que llega el correo de pedido recibido y que incluye el número y un
   enlace de seguimiento. Ábrelo en una ventana sin sesión iniciada: debe ir
   directamente al pedido correspondiente, mostrar los productos reales, el
   estado del pedido, el estado del pago y el total.
6. En el retorno de Wompi, espera la confirmación del evento. El mensaje de
   retorno del navegador no confirma el pago: la página y el panel administrativo
   deben reflejar el resultado que guardó el webhook firmado.
7. En la navegación pública abre **Seguir pedido**. Busca el pedido con el
   número del correo y el mismo correo de compra. Debe mostrar los mismos datos,
   sin pedir iniciar sesión ni revelar dirección, teléfono o correo en los
   detalles del pedido.

## 3. Cambios del pedido y correos

1. En la administración del entorno de prueba, actualiza el pedido en este orden:
   **Pedido recibido → En preparación → Listo para entrega → Entregado**.
   Cada cambio permitido debe generar un correo de actualización.
2. Abre cada correo. El botón **Seguir mi pedido** debe llegar directamente a
   `/orders/track` con acceso seguro al mismo pedido, no a la portada ni a una
   pantalla de inicio de sesión. El estado debe coincidir con el cambio y
   actualizarse también en el enlace anterior de seguimiento.
3. Comprueba que no se permita retroceder un estado, reabrir uno entregado o
   cambiar uno cancelado. Prueba la cancelación desde un pedido todavía abierto
   por separado; al cancelar, el inventario reservado debe quedar disponible
   de nuevo.
4. Para probar contraentrega, crea otro pedido con **Pago al recibir** y, solo
   después de recibir el dinero de prueba, usa **Marcar pago recibido** en los
   detalles administrativos. Confirma que el perfil/seguimiento muestra el pago
   como recibido y que llega el correo con el enlace al mismo pedido.

## 4. Casos de pago y cuenta adicionales

- Crea un pedido Sandbox separado con un método de prueba no aprobado. Comprueba
  que el evento cambie el pago a **Pago no aprobado** y llegue el correo con un
  enlace directo al mismo pedido. Cancela el pedido desde administración y
  comprueba que las unidades reservadas vuelvan al inventario.
- Si una transacción queda pendiente, comprueba que la página de retorno indique
  que espera confirmación y que no diga que el pago se aprobó.
- Repite la compra iniciando sesión con una cuenta cuyo correo esté verificado.
  Verifica que la búsqueda pública funciona con el correo de la cuenta y que el
  perfil también muestra el estado del pedido y del pago.
- Si Brevo no entrega un correo, revisa la configuración y los registros
  operativos del entorno de prueba sin copiar secretos ni el enlace privado a un
  lugar compartido. El correo no debe contener datos de tarjeta.

## Criterios para dar la prueba por aprobada

- El pago solo cambia a confirmado tras recibir y validar el evento de Wompi; el
  retorno del navegador no lo confirma por sí solo.
- El pedido conserva el producto, cantidad, precio y plazo que se compraron.
- El comprador puede consultar el pedido sin sesión mediante enlace de correo o
  número de pedido y correo de compra.
- El correo de confirmación, cada correo de estado y el correo de pago abren el
  pedido correcto directamente; las actualizaciones no llevan a iniciar sesión.
- Los estados visibles son claros, los cambios inválidos se rechazan y el total
  del producto coincide en catálogo, carrito, checkout y seguimiento.
- No hubo acceso a Producción, cobros reales, secretos expuestos ni cambios en la
  base de Producción.

Al terminar, conserva solo el resultado de la prueba y los identificadores de
pedido no sensibles que necesite el equipo. Cancela o archiva los pedidos de
prueba desde el panel, y retira o desactiva el entorno cuando ya no se use.
