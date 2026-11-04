import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import { defaultSeasonEnd } from '../lib/classes/group-sessions'
import { aprendePadelCoursePrices } from '../lib/payments/courses'
import { aprendePadelExtras } from '../lib/payments/extras'
import { aprendePadelCatalog } from '../lib/payments/seed-catalog'
import { defaultBillingSettings } from '../lib/payments/settings'
import { defaultTeacherRates } from '../lib/payments/teacher-pay'

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const reset = process.argv.includes('--reset')

const dbUrl = process.env.SUPABASE_DB_URL
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!dbUrl || !apiUrl || !secret)
  throw new Error('Missing SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')

const sql = postgres(dbUrl, { max: 1, prepare: false, onnotice: () => undefined })

const [existing] = await sql`select count(*)::int as n from core.organizations where id = ${ORG_ID}`
if (existing.n > 0 && !reset) {
  console.log('The organization already exists. Run with --reset to wipe it and seed again.')
  await sql.end()
  process.exit(0)
}

type Gender = 'female' | 'male'
type Level = 'starter' | 'beginner' | 'intermediate'
// Students of the Pioz school, as listed by the school. Birth dates are not known yet.
const piozStudents: Array<{
  first: string
  last?: string
  child: boolean
  gender: Gender
  phone?: string
  level: Level
}> = [
  { first: 'Hector Q', last: 'Quintanar', child: true, gender: 'male', level: 'starter' },
  { first: 'Denisa', child: false, gender: 'female', phone: '664153212', level: 'beginner' },
  { first: 'Manu', last: 'Benijo', child: false, gender: 'male', phone: '650362833', level: 'beginner' },
  { first: 'Juan Jose', child: false, gender: 'male', phone: '623342720', level: 'beginner' },
  { first: 'Jesús', last: 'Tovar', child: false, gender: 'male', phone: '633291999', level: 'beginner' },
  { first: 'Hugo', child: true, gender: 'male', level: 'starter' },
  { first: 'Paula', child: true, gender: 'female', level: 'starter' },
  { first: 'Marcos', child: true, gender: 'male', level: 'starter' },
  { first: 'Hector (Mayor)', child: true, gender: 'male', level: 'starter' },
  { first: 'Carlos', child: true, gender: 'male', level: 'starter' },
  { first: 'Valentina', child: false, gender: 'female', level: 'starter' },
  { first: 'Vega', child: false, gender: 'female', level: 'starter' },
  {
    first: 'Nuria',
    last: 'Blanco Sabroso',
    child: false,
    gender: 'female',
    phone: '658030537',
    level: 'starter',
  },
  { first: 'Cristina', child: false, gender: 'female', phone: '628682826', level: 'beginner' },
  { first: 'Sheila', child: false, gender: 'female', phone: '619675402', level: 'beginner' },
  { first: 'Daniel', child: false, gender: 'male', phone: '665318223', level: 'beginner' },
  { first: 'Jose', child: false, gender: 'male', phone: '609636739', level: 'intermediate' },
  { first: 'Olimpia', child: false, gender: 'female', phone: '686839433', level: 'beginner' },
  { first: 'Sandra', child: false, gender: 'female', phone: '652207012', level: 'beginner' },
]
const DEFAULT_CHILD_BIRTH = '2016-01-01'
const DEFAULT_ADULT_BIRTH = '1990-01-01'

const clubDefs = [
  { name: 'Pioz', color: 'brand' },
  { name: 'Ambite', color: 'info' },
  { name: 'Pozuelo del Rey', color: 'danger' },
  { name: 'Loranca de Tajuña', color: 'warning' },
  { name: 'Mondéjar', color: 'info' },
]
const clubIds = Object.fromEntries(clubDefs.map((c) => [c.name, randomUUID()]))
const teacherDefs = [
  { first: 'Lázaro', club: 'Ambite' },
  { first: 'Nacho', club: 'Pozuelo del Rey' },
  { first: 'Pablo', club: 'Pioz' },
]

// New ids for the AprendePadel price list; the app treats ids as opaque.
const segmentIds = new Map(aprendePadelCatalog.segments.map((s) => [s.id, randomUUID()]))
const mapSegments = (ids: string[]) => ids.map((id) => segmentIds.get(id) ?? id)
const childSegmentId = segmentIds.get('child')!

await sql.begin(async (tx) => {
  if (reset) await tx`delete from core.organizations where id = ${ORG_ID}`
  await tx`insert into core.organizations (id, name, slug) values (${ORG_ID}, 'AprendePadel Academy', 'aprendepadel')`
  for (const moduleId of ['classes', 'payments', 'courts', 'inventory', 'tournaments']) {
    await tx`insert into core.organization_modules (organization_id, module_id, enabled) values (${ORG_ID}, ${moduleId}, ${['classes', 'payments'].includes(moduleId)})`
  }

  for (const club of clubDefs) {
    await tx`insert into core.clubs (id, organization_id, name, city, color, courts) values (${clubIds[club.name]}, ${ORG_ID}, ${club.name}, ${club.name}, ${club.color}, 2)`
  }
  for (const teacher of teacherDefs) {
    const id = randomUUID()
    await tx`insert into core.teachers (id, organization_id, first_name) values (${id}, ${ORG_ID}, ${teacher.first})`
    await tx`insert into core.teacher_clubs (organization_id, teacher_id, club_id) values (${ORG_ID}, ${id}, ${clubIds[teacher.club]})`
  }

  for (const student of piozStudents) {
    const accountId = randomUUID()
    const accountName = student.last ? `${student.first} ${student.last.split(' ')[0]}` : student.first
    await tx`insert into core.billing_accounts (id, organization_id, name) values (${accountId}, ${ORG_ID}, ${accountName})`
    await tx`
      insert into core.students (organization_id, first_name, last_name, birth_date, gender, category, level, club_id, phone, account_id, guardian_name, needs_review)
      values (${ORG_ID}, ${student.first}, ${student.last ?? ''}, ${student.child ? DEFAULT_CHILD_BIRTH : DEFAULT_ADULT_BIRTH}, ${student.gender},
        ${student.child ? 'child' : 'adult'}, ${student.level}, ${clubIds.Pioz}, ${student.phone ?? ''}, ${accountId},
        ${student.child ? 'Pendiente de completar' : ''}, true)`
  }

  // Price list: age segments, monthly rates, combined offers, course prices and settings.
  for (const segment of aprendePadelCatalog.segments) {
    await tx`insert into payments.age_segments (id, organization_id, name, min_age, max_age) values (${segmentIds.get(segment.id)!}, ${ORG_ID}, ${segment.name}, ${segment.minAge}, ${segment.maxAge})`
  }
  for (const rate of aprendePadelCatalog.rates) {
    await tx`insert into payments.individual_rates (organization_id, segment_id, classes_per_week, monthly_cents) values (${ORG_ID}, ${segmentIds.get(rate.segmentId)!}, ${rate.classesPerWeek}, ${rate.monthlyCents})`
  }
  for (const offer of aprendePadelCatalog.offers) {
    const composition = offer.composition.map((slot) => ({
      count: slot.count,
      segmentIds: mapSegments(slot.segmentIds),
    }))
    await tx`insert into payments.pack_offers (organization_id, scope, name, classes_per_week, price_cents, active, composition) values (${ORG_ID}, 'monthly', ${offer.name}, ${offer.classesPerWeek}, ${offer.priceCents}, ${offer.active}, ${tx.json(composition)})`
  }
  for (const rate of aprendePadelCoursePrices.rates) {
    await tx`insert into payments.course_rates (organization_id, segment_id, price_cents) values (${ORG_ID}, ${segmentIds.get(rate.segmentId) ?? childSegmentId}, ${rate.priceCents})`
  }
  for (const offer of aprendePadelCoursePrices.offers) {
    const composition = offer.composition.map((slot) => ({
      count: slot.count,
      segmentIds: mapSegments(slot.segmentIds),
    }))
    await tx`insert into payments.pack_offers (organization_id, scope, name, classes_per_week, price_cents, active, composition) values (${ORG_ID}, 'course', ${offer.name}, 1, ${offer.priceCents}, ${offer.active}, ${tx.json(composition)})`
  }
  const b = defaultBillingSettings
  await tx`
    insert into payments.billing_settings (organization_id, included_per_weekly_class, credit_reasons, leave_notice_days, allowed_payment_methods)
    values (${ORG_ID}, ${b.includedPerWeeklyClass}, ${b.creditReasons}, ${b.leaveNoticeDays}, ${b.allowedPaymentMethods})`
  await tx`
    insert into payments.extra_rates (organization_id, drop_in_cents, private_one_cents, private_two_cents, private_min_age)
    values (${ORG_ID}, ${aprendePadelExtras.dropInCents}, ${aprendePadelExtras.privateOneCents}, ${aprendePadelExtras.privateTwoCents}, ${aprendePadelExtras.privateMinAge})`
  for (const category of ['adult', 'child'] as const) {
    const rate = defaultTeacherRates[category]
    await tx`insert into payments.teacher_pay_rates (organization_id, category, threshold, below_cents, at_or_above_cents) values (${ORG_ID}, ${category}, ${rate.threshold}, ${rate.belowCents}, ${rate.atOrAboveCents})`
  }
  await tx`insert into classes.settings (organization_id, season_end) values (${ORG_ID}, ${defaultSeasonEnd(new Date().toISOString().slice(0, 10))})`
})
await sql.end()

// Auth: the sample teacher accounts of v1 are removed and admins point to this organization.
const admin = createClient(apiUrl, secret, { auth: { autoRefreshToken: false, persistSession: false } })
const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 200 })
if (error) throw error
for (const user of users.users) {
  const meta = user.app_metadata as { role?: string; organization_id?: string }
  if (meta.role === 'teacher' && user.email?.endsWith('@aprendepadel.com')) {
    await admin.auth.admin.deleteUser(user.id)
    console.log(`removed sample teacher account ${user.email}`)
  } else if (meta.role === 'admin' && meta.organization_id !== ORG_ID) {
    await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, organization_id: ORG_ID } })
    console.log(`admin ${user.email} now belongs to the new organization`)
  }
}
console.log(
  `Seeded ${clubDefs.length} clubs, ${teacherDefs.length} teachers and ${piozStudents.length} students.`,
)
