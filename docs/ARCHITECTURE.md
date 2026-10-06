# Arquitectura

AprendePadel es un monorepo Bun con una aplicación Next.js y módulos de dominio independientes.

- `apps/web`: panel web y rutas de la aplicación.
- `packages/core`: roles, enums y contratos de dominio compartidos.
- `packages/db`: clientes Supabase y tipos generados.
- `packages/module-kit`: registro de módulos y feature flags.
- `modules/*`: implementación aislada de cada módulo.

La base de datos usa un único Postgres Supabase. `core` contiene identidad, organización, clubes y alumnos. Cada módulo usa su propio schema y las policies validan también si el módulo está activo para la organización.

En Supabase Cloud, `core` y `classes` deben estar incluidos en `pgrst.db_schemas` para que PostgREST pueda exponerlos. La configuración aplicada en este proyecto es `public, graphql_public, core, classes`. Las tablas siguen protegidas por RLS.

## Business rules

- Web routes are admin-only. Teachers and students will use the separate mobile app.
- Student charges are fixed monthly tariffs assigned to each student; mid-month changes are manually adjusted with a reason.
- Teacher settlements only include completed sessions. Cancelled sessions do not count.
- Teacher pay is hourly and based on enrolled students (not attendance): organization defaults are €12/hour below the threshold and €15/hour from 3 enrolled students; per-teacher overrides can fall back to organization settings.
- Class category is adult or child and cannot be mixed. Database triggers enforce category/club consistency and prevent time overlaps per teacher.
- Payment amounts are stored in integer EUR cents. Partial transactions are append-only ledger rows with method, timestamp and actor.

El rol se guarda en `app_metadata`, nunca en `user_metadata`. El service role key solo debe existir en scripts de servidor y nunca en el navegador.
