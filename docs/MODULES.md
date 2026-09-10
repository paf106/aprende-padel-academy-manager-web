# Desarrollo de módulos

Cada módulo tiene su carpeta en `modules/`, un `package.json`, una definición exportada y su migración SQL.

1. Añade el identificador a `ModuleId` y a `moduleLabels`.
2. Crea el paquete del módulo con una definición `id`, `schema` y estado.
3. Añade su schema y tablas en una migración independiente.
4. Activa RLS y exige `core.module_enabled('<id>')` en cada policy.
5. Registra navegación y permisos en `packages/module-kit`.
6. Añade una activación deshabilitada al seed.

Los módulos hermanos no deben crear foreign keys entre ellos. Pueden depender de `core` y publicar vistas o contratos cuando necesiten integrar otro módulo.
