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

## Variables de entorno

La aplicación web lee `apps/web/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave `sb_publishable_...`, segura para el navegador.
- `SUPABASE_SECRET_KEY`: clave `sb_secret_...`, solo para servidor y scripts administrativos.

No uses una secret key en código cliente ni la subas a Git. La JWT antigua `service_role` está en proceso de retirada por Supabase y la clave que se compartió anteriormente debe rotarse.

## Base de datos

La migración principal está en `supabase/migrations/20260911120000_core.sql` y el seed en `supabase/seed.sql`.

La aplicación usa un monorepo Bun con la app Next.js en `apps/web`, paquetes compartidos en `packages/` y módulos independientes en `modules/`.
