# App móvil

La app móvil usará el mismo proyecto Supabase y el mismo sistema de autenticación. No debe usar la service role key.

El usuario móvil tendrá `app_metadata.role = student` y podrá consultar únicamente sus sesiones mediante `core.student_accounts` o las fichas vinculadas por `core.student_guardians`. Las policies de `classes` son la frontera de seguridad; el cliente móvil no debe confiar en filtros de interfaz.

Antes de crear la app móvil hay que decidir el proveedor de notificaciones push y añadir endpoints o Edge Functions para avisos de cancelación y cambios de horario.
