'use client'

import { useEffect, useMemo, useState } from 'react'
import { FormDrawer } from '@/components/crud/form-drawer'
import type { CalendarDraft } from '@/components/calendar/calendar'
import { SelectField, TextField } from '@/components/ds/field'
import { MultiComboboxField } from '@/components/ds/multi-combobox'
import { defaultCapacity } from '@/lib/classes/capacity'
import { expandClosedDays } from '@/lib/classes/closures'
import { sessionConflicts, sessionSchema, type SessionInput } from '@/lib/classes/session-schema'
import { categoryLabels, levelLabels } from '@/lib/core/labels'
import { formatMoney } from '@/lib/core/money'
import { studentCategories, studentLevels } from '@/lib/core/types'
import { validate } from '@/lib/core/validation'
import { fullName, teacherName } from '@/lib/data/types'
import { useAppData } from '@/lib/data/provider'
import { MAX_PRIVATE_STUDENTS, privateClassPrice } from '@/lib/payments/extras'
import { ageOn } from '@/lib/payments/pricing'

type ExistingSession = { date: string; start: string; duration: number; teacherId: string; status: string }
type Values = Omit<SessionInput, 'duration'> & { duration: '60' | '90' }

const toOptions = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }))

export function SessionFormDrawer({
  initial,
  defaultClubId,
  existing,
  onDraftChange,
  onCreate,
  onClose,
}: {
  initial: { date: string; start: string; duration: 60 | 90 }
  defaultClubId: string
  existing: readonly ExistingSession[]
  onDraftChange: (draft: CalendarDraft) => void
  onCreate: (input: SessionInput) => void
  onClose: () => void
}) {
  const {
    students,
    teachers,
    activeClubs: clubs,
    clubById,
    groups,
    groupById,
    closures,
    extras,
  } = useAppData()
  const [values, setValues] = useState<Values>({
    groupId: '',
    kind: 'group',
    date: initial.date,
    start: initial.start,
    duration: String(initial.duration) as '60' | '90',
    clubId: defaultClubId || (clubs[0]?.id ?? ''),
    teacherId: '',
    category: 'adult',
    level: 'starter',
    studentIds: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const isPrivate = values.kind === 'private'

  useEffect(() => {
    onDraftChange({
      date: values.date,
      start: values.start,
      duration: Number(values.duration),
      title: isPrivate ? 'Clase particular' : undefined,
    })
  }, [values.date, values.start, values.duration, isPrivate, onDraftChange])

  const clubTeachers = useMemo(
    () => teachers.filter((t) => t.active && t.clubIds.includes(values.clubId)),
    [teachers, values.clubId],
  )
  const eligible = useMemo(
    () =>
      students.filter(
        (s) => s.active && (!isPrivate || ageOn(s.birthDate, values.date) >= extras.privateMinAge),
      ),
    [students, values.date, isPrivate, extras.privateMinAge],
  )
  const otherCategory = students.filter(
    (s) => values.studentIds.includes(s.id) && !isPrivate && s.category !== values.category,
  )

  const capacity = isPrivate ? MAX_PRIVATE_STUDENTS : defaultCapacity[values.category]
  const club = clubById(values.clubId)
  const privatePrice =
    isPrivate && values.studentIds.length >= 1 && values.studentIds.length <= MAX_PRIVATE_STUDENTS
      ? privateClassPrice({
          extras,
          students: values.studentIds.length,
          durationMinutes: Number(values.duration),
          courtPricePerHourCents: club?.courtPriceCents ?? 0,
        })
      : null

  const clubTeachersOf = (clubId: string) => teachers.filter((t) => t.active && t.clubIds.includes(clubId))

  const patch = (changes: Partial<Values>) => {
    const next = { ...values, ...changes }
    const dropped: string[] = []
    if ('category' in changes || 'clubId' in changes || 'kind' in changes) {
      if (!clubTeachersOf(next.clubId).some((t) => t.id === next.teacherId)) next.teacherId = ''
    }
    if (next.kind === 'private') {
      next.groupId = ''
      next.category = 'adult'
      next.studentIds = next.studentIds
        .filter((id) => {
          const student = students.find((s) => s.id === id)
          const fits = student ? ageOn(student.birthDate, next.date) >= extras.privateMinAge : false
          if (!fits && student) dropped.push(fullName(student))
          return fits
        })
        .slice(0, MAX_PRIVATE_STUDENTS)
    }
    setNotice(dropped.length ? `Se quitaron por no encajar: ${dropped.join(', ')}.` : '')
    setValues(next)
  }

  const applyGroup = (groupId: string) => {
    const group = groupById(groupId)
    if (!group) {
      setValues((v) => ({ ...v, groupId: '' }))
      return
    }
    setNotice('')
    setValues((v) => ({
      ...v,
      groupId,
      clubId: group.clubId,
      teacherId: group.teacherId,
      category: group.category,
      level: group.level,
      studentIds: group.studentIds.filter((id) => students.some((s) => s.id === id && s.active)),
      duration: String(group.duration) as '60' | '90',
    }))
  }

  const submit = () => {
    const parsed = validate(sessionSchema, { ...values, duration: Number(values.duration) })
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    const chosen = students.filter((s) => values.studentIds.includes(s.id))
    const conflicts = sessionConflicts({
      slot: { date: values.date, start: values.start, duration: parsed.data.duration },
      teacherId: values.teacherId,
      category: values.category,
      students: chosen,
      existing,
      closedDays: expandClosedDays(closures, values.clubId),
      kind: values.kind,
      studentAges: chosen.map((s) => ageOn(s.birthDate, values.date)),
      extras,
    })
    if (Object.keys(conflicts).length) {
      setErrors(conflicts)
      return
    }
    onCreate(parsed.data)
  }

  return (
    <FormDrawer
      open
      title={isPrivate ? 'Nueva clase particular' : 'Nueva clase'}
      submitLabel="Crear clase"
      onSubmit={submit}
      onClose={onClose}
    >
      <SelectField
        label="Tipo de clase"
        value={values.kind}
        onChange={(v) => patch({ kind: v as Values['kind'] })}
        options={[
          { value: 'group', label: 'Clase de grupo' },
          { value: 'private', label: 'Clase particular (1 o 2 alumnos)' },
        ]}
      />
      {isPrivate ? null : (
        <SelectField
          label="Desde un grupo (opcional)"
          placeholder="Clase libre, sin grupo"
          value={values.groupId}
          onChange={applyGroup}
          options={[
            { value: '', label: 'Clase libre, sin grupo' },
            ...groups.map((g) => ({ value: g.id, label: g.name, hint: clubById(g.clubId)?.name })),
          ]}
        />
      )}
      <div className="grid grid-cols-3 gap-3">
        <TextField
          id="session-date"
          type="date"
          label="Día"
          value={values.date}
          error={errors.date}
          onChange={(e) => patch({ date: e.target.value })}
          className="col-span-3 sm:col-span-1"
        />
        <TextField
          id="session-start"
          type="time"
          step={900}
          label="Hora"
          value={values.start}
          error={errors.start}
          onChange={(e) => patch({ start: e.target.value })}
        />
        <SelectField
          label="Duración"
          value={values.duration}
          onChange={(v) => patch({ duration: v as '60' | '90' })}
          options={[
            { value: '60', label: '60 min' },
            { value: '90', label: '90 min' },
          ]}
        />
      </div>
      <SelectField
        label="Sede"
        value={values.clubId}
        error={errors.clubId}
        onChange={(v) => patch({ clubId: v })}
        options={clubs.map((c) => ({ value: c.id, label: c.name }))}
      />
      <SelectField
        label="Profesor"
        placeholder={clubTeachers.length ? 'Elige un profesor' : 'Nadie imparte en esta sede'}
        value={values.teacherId}
        error={errors.teacherId}
        onChange={(v) => patch({ teacherId: v })}
        options={clubTeachers.map((t) => ({ value: t.id, label: teacherName(t) }))}
      />
      <div className={isPrivate ? '' : 'grid grid-cols-2 gap-3'}>
        {isPrivate ? null : (
          <SelectField
            label="Categoría"
            value={values.category}
            onChange={(v) => patch({ category: v as Values['category'] })}
            options={toOptions(studentCategories, categoryLabels)}
          />
        )}
        <SelectField
          label="Nivel"
          value={values.level}
          onChange={(v) => patch({ level: v as Values['level'] })}
          options={toOptions(studentLevels, levelLabels)}
        />
      </div>
      <MultiComboboxField
        label="Alumnos"
        max={capacity}
        value={values.studentIds}
        error={errors.studentIds}
        onChange={(ids) => setValues((v) => ({ ...v, studentIds: ids }))}
        placeholder="Añadir alumno…"
        options={eligible
          .map((s) => ({
            value: s.id,
            label: fullName(s),
            section:
              !isPrivate && s.category !== values.category
                ? 'Otra categoría'
                : s.clubId === values.clubId || s.extraClubIds.includes(values.clubId)
                  ? 'De esta sede'
                  : 'De otras sedes',
          }))
          .sort((a, b) => a.section.localeCompare(b.section))}
      />
      {privatePrice ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          Cada alumno paga {privatePrice.perStudentCents.map(formatMoney).join(' y ')}:{' '}
          {formatMoney(privatePrice.instructorPerStudentCents)} de clase más la pista (
          {formatMoney(privatePrice.courtCents[0])} por alumno). Se suma al cobro del mes.
        </p>
      ) : null}
      {notice ? <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">{notice}</p> : null}
      {otherCategory.length > 0 ? (
        <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
          Este clase mezcla categorías: {otherCategory.map(fullName).join(', ')}{' '}
          {otherCategory.length === 1 ? 'es de' : 'son de'} otra categoría que el clase.
        </p>
      ) : null}
    </FormDrawer>
  )
}
