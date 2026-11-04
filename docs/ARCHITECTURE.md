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
- Fees are monthly and come from the organization's rates: age segments (children, adults, seniors) by classes per
  week, plus combined offers (family, couple). Rates are generic; AprendePadel's 2026-2027 conditions are the demo seed.
- The cheapest combination of offers and individual rates is applied each month. An offer needs all its members that
  month and the same weekly frequency; if a child skips a month the family drops to the offer that fits.
- Included-classes mode (default): the fee includes 4 classes per weekly class, a fifth class is charged in proportion,
  and cancelled classes (rain, bad weather, teacher absent or 20+ minutes late, only one student showed up) and holidays
  are credited the next month. Student absences are never credited. Prorate mode (same-month proration) is optional.
- Leaving needs notice (10 days by default); without it the full month is charged and credits are lost.
- Mid-month joins, leaves and tariff changes are manual price overrides with a mandatory reason.
- Drop-in classes (15 €), private classes (1-2 students, 13+ years, court price added) and closed-price courses
  (June intensive) are extra charges added to the account's month.
- Teacher pay is hourly and depends on enrolled students (default 15 €/h from 3 students, 12 €/h below),
  configurable per organization, per category and per teacher. Only completed classes count.
- Families and couples share one billing account: one monthly charge, with a per-member breakdown.
- Payments are an append-only ledger (cash, transfer or Bizum). Overpayments become credit for the next month.
- Closed billing periods cannot be modified; corrections are adjustments in the following period.

## Future

An external API will expose the same data to a mobile app (teacher and student roles). Keep domain logic in
`lib/<module>` free of Next.js and React imports so it can be reused from that API.
