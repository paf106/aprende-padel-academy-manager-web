# Desarrollo de módulos

`packages/module-kit` es el registro central de rutas y navegación. `classes` y `payments` están activos en la aplicación. Sus páginas y acciones viven actualmente en `apps/web`; `modules/*` contiene metadatos/espacios reservados y todavía no es la capa de implementación.

1. Registra el `ModuleId`, sus rutas y navegación en `packages/module-kit`.
2. Añade o actualiza su estado en `modules/<id>` cuando el paquete de dominio esté implementado.
3. Añade tablas y funciones mediante una migración incremental de Supabase.
4. Activa RLS, grants mínimos y `core.module_enabled('<id>')` para las operaciones del módulo.
5. Usa `requireModule('<id>')` en layouts y vuelve a verificar el módulo en acciones/RPC.
6. Añade pruebas pgTAP para aislamiento, roles y operaciones permitidas/denegadas.
7. Añade la activación inicial al seed como deshabilitada salvo que el producto requiera otra cosa.

Los módulos hermanos no deben crear foreign keys entre ellos. Pueden depender de `core` y publicar vistas o contratos cuando necesiten integrar otro módulo. No marques un módulo como `active` hasta que sus rutas, permisos y migraciones estén implementados.
