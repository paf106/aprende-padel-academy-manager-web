# AprendePadel Academy Manager

Panel de administración para clubes, profesores, alumnos y clases de AprendePadel Academy.

## Desarrollo

Requisitos: Bun y Node.js 20.9 o superior.

```bash
bun install
bun dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Calidad

```bash
bun run lint
bun run typecheck
bun run build
```

Las pruebas de base de datos usan Supabase local y pgTAP:

```bash
bunx supabase start
bunx supabase test db
```

## Variables de entorno

La aplicación web lee `apps/web/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave `sb_publishable_...`, segura para el navegador.
- `SUPABASE_SECRET_KEY`: clave `sb_secret_...`, solo para servidor y scripts administrativos.
- `SUPABASE_DB_URL`: conexión de base de datos solo para scripts administrativos.
- `DEMO_ADMIN_EMAIL` y `DEMO_TEACHER_1_EMAIL` … `DEMO_TEACHER_3_EMAIL`: usuarios Auth existentes que el script demo asignará a la organización y roles de prueba.

No uses una secret key en código cliente ni la subas a Git. La JWT antigua `service_role` está en proceso de retirada por Supabase y la clave que se compartió anteriormente debe rotarse.

## Base de datos

El esquema base está en `supabase/migrations/20261006121046_academy_baseline.sql`; los cambios posteriores están versionados como migraciones incrementales en `supabase/migrations/`. El seed local está en `supabase/seed.sql`.

Para cargar datos de demostración contra el proyecto configurado, crea antes esos cuatro usuarios en Supabase Auth y ejecuta `bun run seed:demo`. El script escribe datos de prueba y debe apuntar solo a un proyecto de desarrollo.

La aplicación usa un monorepo Bun con la app Next.js en `apps/web`, paquetes compartidos en `packages/` y módulos independientes en `modules/`.
