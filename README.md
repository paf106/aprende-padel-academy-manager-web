# AprendePadel Manager

Multi-club SaaS for managing padel clubs and academies. Clubs enable only the modules they need
(classes, payments, court bookings, inventory, tournaments). The MVP covers **Classes** and **Payments**.

The app UI is in Spanish. Code, identifiers, routes, tests and documentation are in English.

## Development

Requirements: Bun and Node.js 20.9+.

```bash
bun install
cp .env.example .env   # then fill in your Supabase values
bun dev                # http://localhost:3000
```

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: public project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_...` key, safe for the browser.
- `SUPABASE_SECRET_KEY`: `sb_secret_...` key, server only. Never expose it to client code or commit it.
- `SUPABASE_DB_URL`: Postgres connection string (session pooler). Only used by the `db:*` scripts, never by the app.

In Supabase, add `core`, `classes` and `payments` under Project Settings > API > Exposed schemas.

## Database

Migrations live in `supabase/migrations` and are applied with a small runner that records them in `public.app_migrations`.

```bash
bun run db:migrate   # apply pending migrations
bun run db:seed      # clubs, teachers, Pioz students and price list (`-- --reset` wipes the organization first)
bun run db:verify    # row level security and API exposure checks
```

## Status

The admin panel reads and writes the Supabase database. The layout loads the organization's data on the server
(`lib/db/load.ts`), screens read it through `useAppData()` and actions are pure reducers (`lib/data/mutations.ts`)
applied optimistically; the changed rows are saved by a server action (`lib/db/persist.ts`). See
[docs/DATABASE.md](docs/DATABASE.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
