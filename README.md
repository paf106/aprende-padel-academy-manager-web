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

## Status

Screens run on demo data (`lib/demo`) until the Supabase schema described in
[docs/DATABASE.md](docs/DATABASE.md) is implemented. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
