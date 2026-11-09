# Baseline y migraciones de Prisma en Neon

## Causa y estado del repositorio

`P3005` es la protección de Prisma cuando `migrate deploy` encuentra tablas
existentes, pero no encuentra historial de migraciones que demuestre cómo se
crearon. No significa que se deba borrar la base ni volver a crear sus tablas.

El repositorio no tiene una migración inicial. Sus dos migraciones actuales son
incrementales:

| Migración                                          | Propósito                                                                                                                                                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261107170000_guest_orders`                      | Permite pedidos de invitado: hace opcionales `Order.userId` y `Order.phone`, agrega `guestName`/`guestEmail`, agrega municipio/departamento a usuario y pedido, y cambia la FK del usuario para usar `ON DELETE SET NULL`. |
| `20261107180000_reconcile_profile_address_columns` | Añade municipio/departamento a `User` y `Order` si faltan. Se solapa con las columnas que agrega la primera migración.                                                                                                     |

La primera migración agrega columnas opcionales y relaja restricciones; no
elimina filas. También elimina y vuelve a crear la FK de `Order.userId`. La
segunda es una reparación idempotente para sus cuatro columnas. Que el SQL sea
idempotente no demuestra que Neon tenga el esquema correcto; las restricciones,
columnas y datos deben compararse antes de registrar migraciones como aplicadas.

`npm run vercel-build` solo ejecuta `npm run build`. Vercel no aplica
migraciones automáticamente. `npm run db:migrate` queda como operación manual
explícita, nunca como paso de compilación.

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
   npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script
   ```

   Revisa el resultado contra `schema.prisma` y las dos migraciones anteriores.
   Solo son aceptables aquí las diferencias explicadas por completo por esas
   dos migraciones. Si falta una tabla, columna requerida, restricción u otro
   objeto no explicado por ellas, detente y prepara una migración de
   reconciliación revisada; no lo tapes con `db push` ni marques nada como
   aplicado. Revisa por separado triggers, políticas RLS u otros objetos que
   la comparación de Prisma no represente.

3. Genera un candidato de baseline a partir del esquema real, no de una
   suposición ni de un esquema histórico que podría no coincidir. Este comando
   solo lee el catálogo y escribe SQL local; no ejecuta el SQL en Neon:

   ```powershell
   npx prisma migrate diff --from-empty --to-url $env:DATABASE_URL --script --output $env:TEMP\primaveral-neon-baseline.sql
   ```

   Inspecciona el archivo. Debe contener únicamente DDL del esquema (sin datos,
   `DROP` inesperados ni credenciales). Usa ese SQL para crear y revisar una
   migración inicial con un nombre anterior a las dos existentes, por ejemplo
   `20261107160000_neon_baseline/migration.sql`. Incluye esa migración en el
   cambio desplegable. La generación no sustituye la revisión ni la prueba.

4. Valida la secuencia completa en PostgreSQL desechable. Restaura en ese
   servidor una copia reciente de Neon con datos anonimizados, o crea una base
   vacía para probar la migración inicial. En una copia con el esquema real,
   registra el baseline como aplicado y despliega las migraciones pendientes;
   luego compara el resultado con `schema.prisma`. En la base vacía, ejecuta
   todas las migraciones desde cero. Confirma que las filas de prueba siguen
   presentes y que columnas, nulabilidad, enums e índices esperados coinciden.
   No uses Neon de producción como base de prueba.
5. Solo después de que el backup, la comparación y el ensayo hayan sido
   aprobados, y de que el baseline revisado esté en el release, registra en
   Neon el baseline generado para esa misma base:

   ```powershell
   npx prisma migrate resolve --applied 20261107160000_neon_baseline
   ```

   `migrate resolve` únicamente registra el historial; no crea ni corrige
   tablas. No marques `20261107170000_guest_orders` ni
   `20261107180000_reconcile_profile_address_columns` como aplicadas salvo que
   hayas verificado que todos sus efectos están presentes. Solo si la
   comparación confirma cada efecto completo, registra las migraciones ya
   reflejadas en Neon:

   ```powershell
   npx prisma migrate resolve --applied 20261107170000_guest_orders
   npx prisma migrate resolve --applied 20261107180000_reconcile_profile_address_columns
   ```

   Si falta algún efecto, no marques esa migración como aplicada. Después de
   registrar el baseline, ejecuta `npm run db:migrate` para aplicar las
   migraciones pendientes y vuelve a revisar. No marques como aplicada una
   migración solo porque algunas de sus columnas ya existan.

6. Verifica el resultado con `npx prisma migrate status` y confirma que no
   quedan diferencias contra `schema.prisma`:

   ```powershell
   npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code
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

No agregues `prisma migrate deploy` al comando de build ni a un hook automático
de Production mientras Neon no tenga un baseline verificado. Después de
completar el baseline en un despliegue controlado, aplica cada migración
pendiente como una operación separada y aprobada antes de desplegar código que
dependa de ella. `DATABASE_URL` se mantiene configurada en Vercel para la
aplicación, pero el build no la usa para modificar la base de datos.
