# Architecture

Single Next.js app (App Router) at the repository root, backed by Supabase (Postgres, Auth, RLS).
No workspaces: modules are separated by folder convention, database schema and route guards, not by packages.

```
app/            Routes. (admin)/ is the club panel, platform/ the superadmin panel, login/
components/
  ds/           Design system: button, card/bento, badge, dropdown, drawer, table, toast...
  calendar/     Shared calendar (day, week, month, year), reused by classes and court bookings
lib/
  core/         Shared types, labels (Spanish UI text), dates, money, calendar math, cn
  classes/      Classes module logic: capacity, CSV student import
  payments/     Payments module logic: proration, teacher pay, billing accounts
  supabase/     Browser and server clients
  demo/         Demo data used until the database exists
  modules.ts    Module registry: routes and navigation per module
  auth.ts       requireAdmin, requirePlatformAdmin
supabase/       Supabase configuration (migrations will live here)
docs/           Documentation
```

## Conventions

- **Language:** code in English, UI text in Spanish. User-facing strings live in the components or in
  `lib/core/labels.ts`; never mix Spanish into identifiers, routes or enum values.
- **Routes:** English slugs (`/classes`, `/students`, `/payments`...).
- **Money:** integer euro cents everywhere. Time zone `Europe/Madrid`.
- **Roles:** stored in `app_metadata` (`role`, `is_platform_admin`), never in `user_metadata`.
- **Imports:** use the `@/` alias (`@/lib/payments/proration`).
- **Tests:** next to the code (`*.test.ts`), run with Vitest.

## Business rules

- Class categories: adult (max 4 students) and child (max 6); categories are never mixed.
- Class status: pending, completed, cancelled (rain, bad weather, other). Cancelled classes are not charged.
- Fees are monthly. Proration: `fee × (scheduled − cancelled) / scheduled`. Student absences are still charged.
- Mid-month joins, leaves and tariff changes are manual adjustments with a mandatory reason.
- Teacher pay is hourly and depends on enrolled students (default 15 €/h from 3 students, 12 €/h below),
  configurable per organization, per category and per teacher. Only completed classes count.
- Families and couples share one billing account: one monthly charge, with a per-member breakdown.
- Payments are an append-only ledger (cash, transfer or Bizum). Overpayments become credit for the next month.
- Closed billing periods cannot be modified; corrections are adjustments in the following period.

## Future

An external API will expose the same data to a mobile app (teacher and student roles). Keep domain logic in
`lib/<module>` free of Next.js and React imports so it can be reused from that API.
