# Arquitectura

AprendePadel es un monorepo Bun con una aplicación Next.js y paquetes compartidos.

- `apps/web`: panel web y rutas de la aplicación.
- `packages/core`: roles, enums y contratos de dominio compartidos.
- `packages/db`: clientes Supabase y tipos generados.
- `packages/ui`: utilidad compartida `cn`; los componentes visuales actuales viven en `apps/web/components/ui`.
- `packages/module-kit`: registro central de módulos, rutas y navegación.
- `modules/*`: metadatos y espacios reservados; las rutas/acciones activas todavía viven en `apps/web`.

La base de datos usa un único Postgres Supabase. `core` contiene identidad, organización, clubes y alumnos. Cada módulo usa su propio schema y las policies validan también si el módulo está activo para la organización.

En Supabase Cloud, los schemas expuestos deben coincidir con `supabase/config.toml`: `public`, `graphql_public`, `core`, `classes` y `payments`. `private` contiene helpers internos y no se expone por PostgREST. Todas las tablas expuestas deben mantener RLS y grants explícitos.

## Business rules

- Web routes are admin-only. Teachers and students will use the separate mobile app.
- Student charges are fixed monthly tariffs assigned to each student; mid-month changes are manually adjusted with a reason.
- Teacher settlements only include completed sessions. Cancelled sessions do not count.
- Teacher pay is hourly and based on enrolled students (not attendance): organization defaults are €12/hour below the threshold and €15/hour from 3 enrolled students; per-teacher overrides can fall back to organization settings.
- Class category is adult or child and cannot be mixed. Database triggers enforce category/club consistency and prevent time overlaps per teacher.
- Payment amounts are stored in integer EUR cents. Partial transactions are append-only ledger rows with method, timestamp and actor.
- El acceso de los módulos se comprueba en layouts, acciones y funciones SQL; las activaciones no se modifican directamente desde el cliente.
- Las operaciones de varias tablas (alta de alumno con tarifa, creación de grupos, cambio de tarifa y generación de cobros) usan funciones SQL transaccionales.

El rol se guarda en `app_metadata`, nunca en `user_metadata`. El service role key solo debe existir en scripts de servidor y nunca en el navegador.
