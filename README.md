# Aprende Padel Academy Manager

Panel interno para gestionar escuelas, alumnos, grupos, sesiones, asistencia, facturacion y liquidaciones de profesores de Aprende Padel Academy.

## Desarrollo

Requisitos: Bun y Node.js 20.9 o superior.

```bash
bun install
bun dev
```

La aplicacion queda disponible en `http://localhost:3000`.

## Calidad

```bash
bun run lint
bun run build
```

## Supabase

La migracion inicial esta en `supabase/migrations/0001_academy_schema.sql` y define el modelo de escuelas, alumnos, familias, grupos, sesiones, asistencia, tarifas, facturacion y liquidaciones.

Antes de conectar una instancia real:

1. Revisa las reglas de negocio y los nombres de los roles `admin` y `teacher`.
2. Ejecuta la migracion desde el flujo de migraciones de Supabase.
3. Configura el rol de cada usuario en `app_metadata.role`, nunca en `user_metadata`.
4. Añade las variables publicables de Supabase solo cuando se implemente el cliente; no guardes claves `service_role` en el navegador.

La pantalla actual usa datos de demostracion. La siguiente capa debe conectar Server Components y Server Actions a Supabase con validacion de sesion y autorizacion dentro de cada mutacion.
