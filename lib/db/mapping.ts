import type { AppData, Session } from '@/lib/data/types'
import { aprendePadelExtras } from '@/lib/payments/extras'
import { defaultBillingSettings } from '@/lib/payments/settings'
import { defaultTeacherRates } from '@/lib/payments/teacher-pay'

export type Row = Record<string, any>
export type TableRows = Record<string, Row[]>

export type TableSpec = {
  schema: 'core' | 'classes' | 'payments'
  table: string
  /** Columns that identify a row. Empty for tables with one row per organization. */
  keys: string[]
  /** Columns of the unique constraint used to upsert (organization_id is always sent). */
  conflict: string
  /** Rows can be added but never edited or deleted. */
  appendOnly?: boolean
  order?: string
}

/** Parents come before children, so upserts run in this order and deletes run in reverse. */
export const TABLES: TableSpec[] = [
  { schema: 'core', table: 'clubs', keys: ['id'], conflict: 'id', order: 'created_at' },
  { schema: 'core', table: 'club_closures', keys: ['id'], conflict: 'id', order: 'starts_on' },
  { schema: 'core', table: 'teachers', keys: ['id'], conflict: 'id', order: 'created_at' },
  { schema: 'core', table: 'teacher_clubs', keys: ['teacher_id', 'club_id'], conflict: 'teacher_id,club_id' },
  { schema: 'core', table: 'billing_accounts', keys: ['id'], conflict: 'id' },
  { schema: 'core', table: 'students', keys: ['id'], conflict: 'id', order: 'created_at' },
  { schema: 'core', table: 'student_clubs', keys: ['student_id', 'club_id'], conflict: 'student_id,club_id' },
  { schema: 'payments', table: 'age_segments', keys: ['id'], conflict: 'id', order: 'min_age' },
  {
    schema: 'payments',
    table: 'individual_rates',
    keys: ['segment_id', 'classes_per_week'],
    conflict: 'segment_id,classes_per_week',
  },
  { schema: 'payments', table: 'pack_offers', keys: ['id'], conflict: 'id' },
  { schema: 'payments', table: 'course_rates', keys: ['segment_id'], conflict: 'segment_id' },
  { schema: 'payments', table: 'billing_settings', keys: [], conflict: 'organization_id' },
  { schema: 'payments', table: 'extra_rates', keys: [], conflict: 'organization_id' },
  {
    schema: 'payments',
    table: 'teacher_pay_rates',
    keys: ['category'],
    conflict: 'organization_id,category',
  },
  { schema: 'classes', table: 'groups', keys: ['id'], conflict: 'id' },
  {
    schema: 'classes',
    table: 'group_members',
    keys: ['group_id', 'student_id'],
    conflict: 'group_id,student_id',
  },
  { schema: 'classes', table: 'courses', keys: ['id'], conflict: 'id' },
  {
    schema: 'classes',
    table: 'course_enrollments',
    keys: ['course_id', 'student_id'],
    conflict: 'course_id,student_id',
  },
  { schema: 'classes', table: 'sessions', keys: ['id'], conflict: 'id', order: 'date' },
  {
    schema: 'classes',
    table: 'session_attendees',
    keys: ['session_id', 'student_id'],
    conflict: 'session_id,student_id',
  },
  { schema: 'payments', table: 'rate_overrides', keys: ['id'], conflict: 'id' },
  {
    schema: 'payments',
    table: 'payments',
    keys: ['id'],
    conflict: 'id',
    appendOnly: true,
    order: 'created_at',
  },
  { schema: 'payments', table: 'extra_charges', keys: ['id'], conflict: 'id' },
]

export const tableName = (spec: Pick<TableSpec, 'schema' | 'table'>) => `${spec.schema}.${spec.table}`
export const rowKey = (spec: TableSpec, row: Row) => spec.keys.map((k) => String(row[k])).join('|')

const time = (value: unknown) => String(value ?? '').slice(0, 5)
const orNull = (value: string | undefined) => (value ? value : null)

/** App data as database rows, without organization_id (the server adds it from the session). */
export function toRows(data: AppData): TableRows {
  const rows: TableRows = {}
  const put = (schema: TableSpec['schema'], table: string, list: Row[]) => {
    rows[`${schema}.${table}`] = list
  }

  put(
    'core',
    'clubs',
    data.clubs.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      postal_code: c.postalCode,
      courts: c.courts,
      court_price_cents: c.courtPriceCents,
      color: c.color,
      photo: c.photo,
      active: c.active,
    })),
  )
  put(
    'core',
    'club_closures',
    data.closures.map((c) => ({
      id: c.id,
      club_id: orNull(c.clubId),
      starts_on: c.from,
      ends_on: c.to,
      reason: c.reason,
    })),
  )
  put(
    'core',
    'teachers',
    data.teachers.map((t) => ({
      id: t.id,
      first_name: t.firstName,
      last_name: t.lastName,
      email: t.email,
      phone: t.phone,
      active: t.active,
    })),
  )
  put(
    'core',
    'teacher_clubs',
    data.teachers.flatMap((t) => t.clubIds.map((clubId) => ({ teacher_id: t.id, club_id: clubId }))),
  )
  put(
    'core',
    'billing_accounts',
    data.accounts.map((a) => ({ id: a.id, name: a.name })),
  )
  put(
    'core',
    'students',
    data.students.map((s) => ({
      id: s.id,
      first_name: s.firstName,
      last_name: s.lastName,
      birth_date: s.birthDate,
      gender: s.gender,
      category: s.category,
      level: s.level,
      club_id: s.clubId,
      email: s.email,
      phone: s.phone,
      account_id: s.accountId,
      active: s.active,
      guardian_name: s.guardianName,
      guardian_phone: s.guardianPhone,
      needs_review: s.needsReview,
    })),
  )
  put(
    'core',
    'student_clubs',
    data.students.flatMap((s) =>
      [...new Set(s.extraClubIds)].map((clubId) => ({ student_id: s.id, club_id: clubId })),
    ),
  )

  put(
    'payments',
    'age_segments',
    data.catalog.segments.map((s) => ({ id: s.id, name: s.name, min_age: s.minAge, max_age: s.maxAge })),
  )
  put(
    'payments',
    'individual_rates',
    data.catalog.rates.map((r) => ({
      segment_id: r.segmentId,
      classes_per_week: r.classesPerWeek,
      monthly_cents: r.monthlyCents,
    })),
  )
  const offerRow = (scope: 'monthly' | 'course') => (o: AppData['catalog']['offers'][number]) => ({
    id: o.id,
    scope,
    name: o.name,
    classes_per_week: o.classesPerWeek,
    price_cents: o.priceCents,
    active: o.active,
    composition: o.composition.map((slot) => ({ count: slot.count, segmentIds: slot.segmentIds })),
  })
  put('payments', 'pack_offers', [
    ...data.catalog.offers.map(offerRow('monthly')),
    ...data.coursePrices.offers.map(offerRow('course')),
  ])
  put(
    'payments',
    'course_rates',
    data.coursePrices.rates.map((r) => ({ segment_id: r.segmentId, price_cents: r.priceCents })),
  )
  const b = data.billing
  put('payments', 'billing_settings', [
    {
      mode: b.mode,
      included_per_weekly_class: b.includedPerWeeklyClass,
      charge_extra_classes: b.chargeExtraClasses,
      credit_timing: b.creditTiming,
      credit_reasons: b.creditReasons,
      leave_notice_days: b.leaveNoticeDays,
      allowed_payment_methods: b.allowedPaymentMethods,
    },
  ])
  put('payments', 'extra_rates', [
    {
      drop_in_cents: data.extras.dropInCents,
      private_one_cents: data.extras.privateOneCents,
      private_two_cents: data.extras.privateTwoCents,
      private_min_age: data.extras.privateMinAge,
    },
  ])
  put(
    'payments',
    'teacher_pay_rates',
    (['adult', 'child'] as const).map((category) => ({
      category,
      threshold: data.teacherRates[category].threshold,
      below_cents: data.teacherRates[category].belowCents,
      at_or_above_cents: data.teacherRates[category].atOrAboveCents,
    })),
  )

  put(
    'classes',
    'groups',
    data.groups.map((g) => ({
      id: g.id,
      name: g.name,
      club_id: g.clubId,
      teacher_id: g.teacherId,
      category: g.category,
      level: g.level,
      weekday: g.weekday,
      start_time: g.start,
      duration: g.duration,
      starts_on: g.startsOn,
      ends_on: orNull(g.endsOn),
      active: g.active,
    })),
  )
  put(
    'classes',
    'group_members',
    data.groups.flatMap((g) =>
      [...new Set(g.studentIds)].map((studentId) => ({ group_id: g.id, student_id: studentId })),
    ),
  )
  put(
    'classes',
    'courses',
    data.courses.map((c) => ({
      id: c.id,
      name: c.name,
      club_id: c.clubId,
      teacher_id: c.teacherId,
      category: c.category,
      level: c.level,
      starts_on: c.startsOn,
      ends_on: c.endsOn,
      weekdays: c.weekdays,
      start_time: c.start,
      duration: c.duration,
      active: c.active,
    })),
  )
  put(
    'classes',
    'course_enrollments',
    data.courses.flatMap((c) =>
      [...new Set(c.studentIds)].map((studentId) => ({ course_id: c.id, student_id: studentId })),
    ),
  )
  put(
    'classes',
    'sessions',
    data.sessions.map((s) => ({
      id: s.id,
      group_id: orNull(s.groupId),
      course_id: orNull(s.courseId),
      kind: s.kind ?? 'group',
      club_id: s.clubId,
      teacher_id: s.teacherId,
      date: s.date,
      start_time: s.start,
      duration: s.duration,
      category: s.category,
      level: s.level ?? null,
      status: s.status,
      cancel_reason: s.cancelReason ?? null,
      credited_student_ids: s.creditedStudentIds ?? null,
    })),
  )
  put(
    'classes',
    'session_attendees',
    data.sessions.flatMap((s) =>
      [...new Set(s.studentIds)].map((studentId) => ({
        session_id: s.id,
        student_id: studentId,
        attendance: s.attendance?.[studentId] ?? 'unmarked',
        origin: s.guests?.[studentId] ?? 'group',
      })),
    ),
  )

  put(
    'payments',
    'rate_overrides',
    data.overrides.map((o) => ({
      id: o.id,
      scope: o.scope,
      target_id: o.targetId,
      amount_cents: o.amountCents,
      reason: o.reason,
      from_month: o.from,
      to_month: o.to,
    })),
  )
  put(
    'payments',
    'payments',
    data.payments.map((p) => ({
      id: p.id,
      account_id: p.accountId,
      month: p.month,
      amount_cents: p.amountCents,
      method: p.method,
      paid_on: p.paidOn,
    })),
  )
  put(
    'payments',
    'extra_charges',
    data.extraCharges.map((c) => ({
      id: c.id,
      account_id: c.accountId,
      student_id: c.studentId,
      kind: c.kind,
      description: c.description,
      amount_cents: c.amountCents,
      month: c.month,
      session_id: c.sessionId ?? null,
      course_id: c.courseId ?? null,
    })),
  )
  return rows
}

/** Database rows as app data. Missing singleton rows fall back to sensible defaults. */
export function fromRows(rows: TableRows): AppData {
  const get = (key: string) => rows[key] ?? []
  const group = <T extends Row>(list: T[], by: string) => {
    const map = new Map<string, T[]>()
    for (const row of list) map.set(row[by], [...(map.get(row[by]) ?? []), row])
    return map
  }

  const teacherClubs = group(get('core.teacher_clubs'), 'teacher_id')
  const studentClubs = group(get('core.student_clubs'), 'student_id')
  const groupMembers = group(get('classes.group_members'), 'group_id')
  const enrollments = group(get('classes.course_enrollments'), 'course_id')
  const attendees = group(get('classes.session_attendees'), 'session_id')

  const offers = (scope: string) =>
    get('payments.pack_offers')
      .filter((o) => o.scope === scope)
      .map((o) => ({
        id: o.id,
        name: o.name,
        classesPerWeek: o.classes_per_week,
        priceCents: o.price_cents,
        active: o.active,
        composition: o.composition,
      }))

  const billingRow = get('payments.billing_settings')[0]
  const extrasRow = get('payments.extra_rates')[0]
  const rates = { ...defaultTeacherRates }
  for (const row of get('payments.teacher_pay_rates')) {
    rates[row.category as 'adult' | 'child'] = {
      threshold: row.threshold,
      belowCents: row.below_cents,
      atOrAboveCents: row.at_or_above_cents,
    }
  }

  return {
    clubs: get('core.clubs').map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      postalCode: c.postal_code,
      color: c.color,
      courts: c.courts,
      courtPriceCents: c.court_price_cents,
      photo: c.photo,
      active: c.active,
    })),
    closures: get('core.club_closures').map((c) => ({
      id: c.id,
      clubId: c.club_id ?? '',
      from: c.starts_on,
      to: c.ends_on,
      reason: c.reason,
    })),
    teachers: get('core.teachers').map((t) => ({
      id: t.id,
      firstName: t.first_name,
      lastName: t.last_name,
      email: t.email,
      phone: t.phone,
      clubIds: (teacherClubs.get(t.id) ?? []).map((r) => r.club_id),
      active: t.active,
    })),
    accounts: get('core.billing_accounts').map((a) => ({ id: a.id, name: a.name })),
    students: get('core.students').map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      gender: s.gender,
      category: s.category,
      level: s.level,
      birthDate: s.birth_date,
      clubId: s.club_id,
      extraClubIds: (studentClubs.get(s.id) ?? []).map((r) => r.club_id),
      email: s.email,
      phone: s.phone,
      accountId: s.account_id,
      active: s.active,
      guardianName: s.guardian_name,
      guardianPhone: s.guardian_phone,
      needsReview: s.needs_review,
    })),
    groups: get('classes.groups').map((g) => ({
      id: g.id,
      name: g.name,
      clubId: g.club_id,
      teacherId: g.teacher_id,
      category: g.category,
      level: g.level,
      weekday: g.weekday,
      start: time(g.start_time),
      duration: g.duration,
      startsOn: g.starts_on,
      endsOn: g.ends_on ?? '',
      active: g.active,
      studentIds: (groupMembers.get(g.id) ?? []).map((r) => r.student_id),
    })),
    courses: get('classes.courses').map((c) => ({
      id: c.id,
      name: c.name,
      clubId: c.club_id,
      teacherId: c.teacher_id,
      category: c.category,
      level: c.level,
      startsOn: c.starts_on,
      endsOn: c.ends_on,
      weekdays: c.weekdays,
      start: time(c.start_time),
      duration: c.duration,
      active: c.active,
      studentIds: (enrollments.get(c.id) ?? []).map((r) => r.student_id),
    })),
    sessions: get('classes.sessions').map((s): Session => {
      const list = attendees.get(s.id) ?? []
      const guests: NonNullable<Session['guests']> = {}
      for (const a of list) if (a.origin !== 'group') guests[a.student_id] = a.origin
      return {
        id: s.id,
        groupId: s.group_id ?? '',
        courseId: s.course_id ?? undefined,
        kind: s.kind,
        clubId: s.club_id,
        teacherId: s.teacher_id,
        date: s.date,
        start: time(s.start_time),
        duration: s.duration,
        category: s.category,
        level: s.level ?? undefined,
        status: s.status,
        cancelReason: s.cancel_reason ?? undefined,
        creditedStudentIds: s.credited_student_ids ?? undefined,
        studentIds: list.map((a) => a.student_id),
        attendance: Object.fromEntries(list.map((a) => [a.student_id, a.attendance])),
        guests: Object.keys(guests).length > 0 ? guests : undefined,
      }
    }),
    catalog: {
      segments: get('payments.age_segments').map((s) => ({
        id: s.id,
        name: s.name,
        minAge: s.min_age,
        maxAge: s.max_age ?? null,
      })),
      rates: get('payments.individual_rates').map((r) => ({
        segmentId: r.segment_id,
        classesPerWeek: r.classes_per_week,
        monthlyCents: r.monthly_cents,
      })),
      offers: offers('monthly'),
    },
    coursePrices: {
      rates: get('payments.course_rates').map((r) => ({
        segmentId: r.segment_id,
        priceCents: r.price_cents,
      })),
      offers: offers('course'),
    },
    billing: billingRow
      ? {
          mode: billingRow.mode,
          includedPerWeeklyClass: billingRow.included_per_weekly_class,
          chargeExtraClasses: billingRow.charge_extra_classes,
          creditTiming: billingRow.credit_timing,
          creditReasons: billingRow.credit_reasons,
          leaveNoticeDays: billingRow.leave_notice_days,
          allowedPaymentMethods: billingRow.allowed_payment_methods,
        }
      : defaultBillingSettings,
    extras: extrasRow
      ? {
          dropInCents: extrasRow.drop_in_cents,
          privateOneCents: extrasRow.private_one_cents,
          privateTwoCents: extrasRow.private_two_cents,
          privateMinAge: extrasRow.private_min_age,
        }
      : aprendePadelExtras,
    teacherRates: rates,
    overrides: get('payments.rate_overrides').map((o) => ({
      id: o.id,
      scope: o.scope,
      targetId: o.target_id,
      amountCents: o.amount_cents,
      reason: o.reason,
      from: o.from_month,
      to: o.to_month,
    })),
    payments: get('payments.payments').map((p) => ({
      id: p.id,
      accountId: p.account_id,
      month: p.month,
      amountCents: p.amount_cents,
      method: p.method,
      paidOn: p.paid_on,
    })),
    extraCharges: get('payments.extra_charges').map((c) => ({
      id: c.id,
      accountId: c.account_id,
      studentId: c.student_id,
      kind: c.kind,
      description: c.description,
      amountCents: c.amount_cents,
      month: c.month,
      sessionId: c.session_id ?? undefined,
      courseId: c.course_id ?? undefined,
    })),
  }
}

export type Changes = {
  /** Key columns of the rows to remove, by table. */
  deletes: Record<string, Row[]>
  upserts: Record<string, Row[]>
}

/** Rows that differ between two versions of the data. */
export function diffRows(prev: TableRows, next: TableRows): Changes {
  const changes: Changes = { deletes: {}, upserts: {} }
  for (const spec of TABLES) {
    const name = tableName(spec)
    const before = new Map((prev[name] ?? []).map((row) => [rowKey(spec, row), row]))
    const after = new Map((next[name] ?? []).map((row) => [rowKey(spec, row), row]))
    const upserts = [...after].filter(([key, row]) => JSON.stringify(before.get(key)) !== JSON.stringify(row))
    if (upserts.length > 0) changes.upserts[name] = upserts.map(([, row]) => row)
    if (spec.keys.length > 0 && !spec.appendOnly) {
      const deletes = [...before].filter(([key]) => !after.has(key))
      if (deletes.length > 0) {
        changes.deletes[name] = deletes.map(([, row]) =>
          Object.fromEntries(spec.keys.map((k) => [k, row[k]])),
        )
      }
    }
  }
  return changes
}

export const hasChanges = (changes: Changes) =>
  Object.keys(changes.deletes).length > 0 || Object.keys(changes.upserts).length > 0
