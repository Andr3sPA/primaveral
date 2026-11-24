# Baseline y migraciones de Prisma en Neon

## Causa y estado del repositorio

`P3005` es la protección de Prisma cuando `migrate deploy` encuentra tablas
existentes, pero no encuentra historial de migraciones que demuestre cómo se
crearon. No significa que se deba borrar la base ni volver a crear sus tablas.

El repositorio conserva el esquema base en
`20261107160000_neon_baseline`. Ese DDL se generó desde el esquema leído en
Neon durante la investigación de este incidente; no contiene filas ni secretos.
La inspección histórica de solo lectura para preparar ese baseline encontró que
la base no tenía
`_prisma_migrations`, las tablas/enums sociales ni las nuevas columnas de
producto. También encontró `Order.userId` y `Order.phone` obligatorios y
ausentes los campos de pedidos invitados, direcciones extendidas y seguimiento.
Ese hallazgo no describe el estado actual de Producción: el diagnóstico del
incidente de catálogo del 21 de noviembre de 2026 confirma que
`_prisma_migrations` ya existe, pero falta aplicar
`20261121100000_product_availability_and_gallery`, que agrega las columnas
`MenuItem.requiresAvailabilityConfirmation` y `MenuItem.images`.

Las migraciones incrementales posteriores son:

| Migración                                          | Propósito                                                                                                                                                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261107170000_guest_orders`                      | Permite pedidos de invitado: hace opcionales `Order.userId` y `Order.phone`, agrega `guestName`/`guestEmail`, agrega municipio/departamento a usuario y pedido, y cambia la FK del usuario para usar `ON DELETE SET NULL`. |
| `20261107180000_reconcile_profile_address_columns` | Añade municipio/departamento a `User` y `Order` si faltan. Se solapa con las columnas que agrega la primera migración.                                                                                                     |
| `20261109150000_guest_order_tracking_token`        | Agrega el token único para consultar pedidos de invitado.                                                                                                                                                                  |
| `20261114170000_social_publishing`                 | Crea las tablas, enums e índices para la cola de publicaciones sociales.                                                                                                                                                   |
| `20261114180000_product_social_opt_in`             | Agrega el estado `CANCELLED` y el opt-in social anterior por producto.                                                                                                                                                     |
| `20261115100000_per_platform_social_targets`       | Reemplaza el opt-in único con las opciones independientes de Facebook e Instagram, preservando los opt-ins existentes.                                                                                                     |
| `20261121100000_product_availability_and_gallery`  | Agrega `MenuItem.requiresAvailabilityConfirmation` y `MenuItem.images`, usados por el catálogo de productos.                                                                                                               |
| `20261122150000_product_groups`                    | Reemplaza la categoría libre por grupo y subgrupo; conserva las categorías bordadas reconocidas y clasifica las demás como No bordados.                                                                                    |
| `20261123200000_manual_social_publications`        | Elimina el opt-in automático por producto, cancela sus publicaciones pendientes y permite varias publicaciones por producto y plataforma.                                                                                  |

Las migraciones de pedidos agregan columnas opcionales y relajan restricciones;
no eliminan filas. La primera también reemplaza la FK de `Order.userId`. La
segunda es una reparación idempotente para sus cuatro columnas. Que el SQL sea
idempotente no demuestra que Neon tenga el esquema correcto; las restricciones,
columnas y datos deben compararse antes de registrar migraciones como aplicadas.

`npm run vercel-build` aplica `npm run db:migrate` antes de compilar únicamente
cuando `VERCEL_ENV=production`. El script detiene el build si falla la
migración, por lo que Next.js no puede compilar ni desplegar código que dependa
de columnas ausentes. Los builds de Preview y locales no modifican ninguna
base. `db:migrate` ejecuta `prisma migrate deploy`, que aplica en orden todas
las migraciones pendientes del historial; revisa cada migración y conserva su
compatibilidad hacia atrás antes de integrarla. Si una base existente carece
de un baseline registrado, Prisma debe fallar y detener el build; no se debe
sortear el error con `db push` o `migrate resolve` automático.

El perfil necesita las columnas `User.municipality` y `User.department` de la
migración `20261107180000_reconcile_profile_address_columns`. Si el perfil
registra un error Prisma `P2022`, el servidor puede mostrar y guardar los datos
básicos mientras esas columnas falten, pero municipio y departamento no estarán
disponibles hasta aplicar las migraciones pendientes siguiendo este
procedimiento.

## Procedimiento para una base Neon existente

Realiza estos pasos desde una máquina controlada, con acceso solo a la base
Neon correcta. No compartas ni guardes la URL de conexión en el repositorio,
logs, tickets o comandos versionados.

1. Crea y verifica un snapshot/backup de Neon, registra el punto de restauración
   y confirma que puedes restaurarlo. Haz primero el ensayo completo en una
   base de staging aislada.
2. Configura `DATABASE_URL` localmente para la base elegida. No uses
   `db:push`, `migrate reset` ni ejecutes `migrate resolve` hasta terminar la
   comparación. El siguiente comando es de solo lectura: muestra el SQL
   necesario para que el esquema actual alcance el modelo de Prisma:

   ```powershell
   npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
   ```

   Revisa el resultado contra `schema.prisma` y todas las migraciones
   incrementales anteriores. Solo son aceptables las diferencias explicadas
   por completo por esas migraciones. Si falta una tabla, columna requerida,
   restricción u otro objeto no explicado por ellas, detente y prepara una
   migración de reconciliación revisada; no lo tapes con `db push` ni marques
   nada como aplicado. Revisa por separado triggers, políticas RLS u otros
   objetos que Prisma no represente.

3. Genera un candidato de baseline a partir del esquema real, no de una
   suposición ni de un esquema histórico que podría no coincidir. Este comando
   solo lee el catálogo y escribe SQL local; no ejecuta el SQL en Neon:

   ```powershell
   npx prisma migrate diff --from-empty --to-schema-datasource prisma/schema.prisma --script --output $env:TEMP\primaveral-neon-baseline.sql
   ```

   Inspecciona el archivo. Debe contener únicamente DDL del esquema (sin datos,
   `DROP` inesperados ni credenciales) y debe coincidir con
   `prisma/migrations/20261107160000_neon_baseline/migration.sql`. Este archivo
   versionado se generó desde el esquema inspeccionado para este incidente. Si
   el esquema real cambió desde entonces o la comparación difiere, no lo
   registres como aplicado: revisa y genera un baseline nuevo. La generación no
   sustituye la revisión ni la prueba.

4. Valida la secuencia completa en PostgreSQL desechable. Restaura en ese
   servidor una copia reciente de Neon con datos anonimizados, o crea una base
   vacía para probar la migración inicial. En una copia con el esquema real,
   registra el baseline como aplicado y despliega las migraciones pendientes;
   luego compara el resultado con `schema.prisma`. En la base vacía, ejecuta
   primero el baseline y después todas las migraciones desde cero. Confirma que
   las filas de prueba siguen presentes y que columnas, nulabilidad, enums e
   índices esperados coinciden. No uses Neon de producción como base de prueba.
5. Solo después de que el backup, la comparación y el ensayo hayan sido
   aprobados, y de que el baseline revisado esté en el release, registra en
   Neon el baseline generado para esa misma base:

   `migrate resolve` únicamente registra el historial; no crea ni corrige
   tablas. Para el esquema de Neon observado durante este incidente, registra
   solo el baseline como aplicado y deja las migraciones incrementales
   pendientes para que Prisma aplique sus cambios:

   ```powershell
   npx prisma migrate resolve --applied 20261107160000_neon_baseline
   npm run db:migrate
   ```

   Ejecuta esos comandos solo tras aprobar backup, comparación y ensayo en
   staging. Si una nueva comparación demuestra que alguna migración ya está
   reflejada en Neon, regístrala como aplicada solo después de verificar todos
   sus efectos; nunca lo hagas porque existan algunas de sus columnas.

6. Verifica el resultado con `npx prisma migrate status` y confirma que no
   quedan diferencias contra `schema.prisma`:

   ```powershell
   npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
   ```

   Conserva el snapshot, el SQL de baseline y el resultado de la revisión junto
   al registro del despliegue. Si el baseline o el estado real no coinciden
   exactamente, detente; no improvises un `resolve`.

El SQL de baseline se genera por base y se debe revisar/versionar antes de
usarlo. Una base vacía y una Neon existente siguen el mismo historial a partir
de ese baseline; la base existente registra como aplicada la migración
equivalente, mientras la base vacía ejecuta su DDL. Nunca reemplaces este
proceso por `db push`.

## Vercel

En cada build de Production, el script configurado en `vercel-build` migra
primero y después ejecuta `next build`; una migración fallida impide el build.
Vercel define `VERCEL_ENV=production` para ese entorno. Preview y desarrollo
omiten la migración para no tocar por accidente la base de Producción. La
conexión `DATABASE_URL` debe apuntar a la base Neon de Production en ese
entorno. Las migraciones automáticas no reemplazan el procedimiento de baseline
anterior: bases existentes sin historial verificado deben prepararse y
ensayarse primero, y no deben recibir `db push`, `migrate resolve` ni
migraciones hasta completar ese procedimiento.
