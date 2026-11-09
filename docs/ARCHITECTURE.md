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
  data/         App data types, pure reducers, billing views and the client data provider
  db/           Row mapping, server loading and saving (server actions), club photo upload
  modules.ts    Module registry: routes and navigation per module
  auth.ts       requireAdmin, requirePlatformAdmin
supabase/       Migrations (supabase/migrations), applied with bun run db:migrate
docs/           Documentation
```

## Conventions

- **Language:** code in English, UI text in Spanish. User-facing strings live in the components or in
  `lib/core/labels.ts`; never mix Spanish into identifiers, routes or enum values.
- **Routes:** English slugs (`/classes`, `/students`, `/payments`...).
- **Money:** integer euro cents everywhere.
- **Dates and times:** see "Dates and times" below; the organization always works in `Europe/Madrid`.
- **Security:** the Content-Security-Policy is built per request in `proxy.ts` with a nonce (no `unsafe-inline` for scripts); database errors are logged on the server and never shown to the user.
- **Roles:** stored in `app_metadata` (`role`, `is_platform_admin`), never in `user_metadata`.
- **Imports:** use the `@/` alias (`@/lib/payments/proration`).
- **Tests:** next to the code (`*.test.ts`), run with Vitest.

## Business rules

- Class categories: adult (max 4 students) and child (max 6). Adults and children can share a group, class or
  course (for example a girl who turns 12 stays in her children's group); the group's category sets the capacity and
  the teacher pay rate.
- Class status: pending, completed, cancelled (rain, bad weather, teacher absent or late, only one student, no student
  came, other). Cancelled classes are not paid to the teacher, except when no student came: then the students lose the
  class (it is charged) and the teacher is paid as if it had been given. With "only one student", the student who could
  come is not charged and the others are, and the teacher is not paid. A cancelled or finished class can be set back to
  pending.
- Age segments: 7 to 11 children, 12 to 65 adults, 66 and over seniors. A student changes segment the month after
  their birthday, whatever the day (even the 1st): the segment of a month is decided by the age on the last day of the
  previous month. Closed-price courses use the age on the first day of the course.
- Fees are monthly and come from the organization's rates: age segments by classes per week, plus combined offers
  (family, couple). Rates are generic; AprendePadel's 2026-2027 conditions are loaded by the seed script.
- The cheapest combination of offers and individual rates is applied each month. An offer needs all its members that
  month and the same weekly frequency; if a child skips a month the family drops to the offer that fits. The saving
  of an offer, or of a price fixed by hand for a whole account, is shared equally between its members (35 + 25 + 25
  for 70 is 30 + 20 + 20); spare cents go to the first members and nobody pays less than zero.
- The monthly fee follows the classes in the calendar: rate × classes of the month ÷ 4 per weekly class. A month
  with 3 classes is prorated (35 € becomes 26,25 €); one with 5 charges the extra class (43,75 €). Closed days and
  cancelled classes with a discount reason (rain, bad weather, teacher absent or 20+ minutes late, only one student
  showed up) are not charged, in the same month. Student absences are always charged. Joining or leaving in the
  middle of the month is prorated by itself, because only the classes the student has count.
- Leaving needs notice (10 days by default); without it the full month is charged.
- Manual price overrides (with a mandatory reason) are for exceptions such as scholarships.
- There are no make-up classes: a student added to a class that is not theirs pays a single class.
- Groups generate their classes from their start date until the end of the season (30 June). A student who joins a
  group later is only in the classes from the chosen date (`joined_on`): regenerating the calendar never adds them to
  earlier classes. Editing a group updates
  its pending classes from a chosen date: attendance, single-class guests and substitute teachers are kept, and
  finished, cancelled and manually created classes are never touched. Deleting a class is allowed; editing the group
  can create it again if the date still fits. Classes can also be repeated every week from the calendar.
- Single classes (15 €), private classes (1-2 students, 12+ years, court price added) and closed-price courses
  (June intensive) are extra charges added to the account's month.
- Teacher pay is hourly and depends on enrolled students (default 15 €/h from 3 students, 12 €/h below),
  configurable per organization, per category and per teacher. Only completed classes count.
- Families and couples share one billing account: put the students in the same account and the offer applies by
  itself. One monthly charge, with a per-member breakdown. A shared account has a name of its own ("Denisa y
  Jesús"); an account with a single student is always named after that student, with their full name.
- Payments are an append-only ledger (cash, transfer or Bizum), registered for the month being viewed. Overpayments
  become credit for the next month. A payment entered by mistake is voided, never deleted: a new entry points to it
  (`reverses_id`), neither counts, and the month goes back to unpaid. A payment can be voided once.
- The payments page can be filtered by club: accounts with a student whose usual club it is, the classes given there
  and its groups.

## Dates and times

- The organization works in `Europe/Madrid`, with summer time. "Today", billing months, ages and default dates are
  always computed with Madrid time (`localTodayInTimeZone('Europe/Madrid')`), never with UTC (`toISOString`) or the
  browser's time zone.
- Classes are stored as a date (`date`) and a wall-clock time (`time`) without time zone: "Monday 19:00" is 19:00 in
  Madrid all year. To draw a class on the calendar, build its instant with `zonedInstant(date, time, 'Europe/Madrid')`;
  never write a fixed offset such as `+02:00`.
- Dates without time (weeks, months, closures, notice days, age) are `YYYY-MM-DD` strings. UTC arithmetic is used only
  to count days (`addDays`, `addMonths`, `ageOn`). Check text typed by the user with `isIsoDate` and `isMonth`.
- Shown to the user as 24-hour time (19:00) and `dd/mm/yyyy` dates, with month and day names in Spanish. System
  moments (`created_at`) are `timestamptz`.

## Future

An external API will expose the same data to a mobile app (teacher and student roles). Keep domain logic in
`lib/<module>` free of Next.js and React imports so it can be reused from that API.
