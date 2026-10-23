# Modules

Each module is sold separately and enabled per organization. The registry lives in `lib/modules.ts`
(routes, navigation, status). A module is `active` only when its routes, permissions and migrations exist.

To add a module:

1. Register its `ModuleId`, routes and navigation in `lib/modules.ts` and add its label in `lib/core/labels.ts`.
2. Put its domain logic in `lib/<module>/` (pure functions with co-located tests).
3. Put its routes under `app/(admin)/<route>/` and guard them with `requireModule('<id>')`.
4. Add its tables in a dedicated Postgres schema with RLS and a `core.module_enabled('<id>')` check.
5. Add pgTAP tests for tenant isolation, roles and allowed/denied operations.

Sibling modules never create foreign keys between each other. They depend on `core` and integrate through
views or contracts.
