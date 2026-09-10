# Arquitectura

AprendePadel es un monorepo Bun con una aplicación Next.js y módulos de dominio independientes.

- `apps/web`: panel web y rutas de la aplicación.
- `packages/core`: roles, enums y contratos de dominio compartidos.
- `packages/db`: clientes Supabase y tipos generados.
- `packages/module-kit`: registro de módulos y feature flags.
- `modules/*`: implementación aislada de cada módulo.

La base de datos usa un único Postgres Supabase. `core` contiene identidad, organización, clubes y alumnos. Cada módulo usa su propio schema y las policies validan también si el módulo está activo para la organización.

El rol se guarda en `app_metadata`, nunca en `user_metadata`. El service role key solo debe existir en scripts de servidor y nunca en el navegador.
