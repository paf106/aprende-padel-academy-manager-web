'use client'

import { useMemo, useState } from 'react'
import { FormDrawer } from '@/components/crud/form-drawer'
import { MultiSelectField, SelectField, TextField } from '@/components/ds/field'
import { MultiComboboxField } from '@/components/ds/multi-combobox'
import { useToast } from '@/components/ds/toast'
import { defaultCapacity } from '@/lib/classes/capacity'
import { expandClosedDays } from '@/lib/classes/closures'
import {
  courseConflicts,
  courseSchema,
  emptyCourseInput,
  generateCourseSlots,
  type CourseInput,
} from '@/lib/classes/course-schema'
import { categoryLabels, levelLabels } from '@/lib/core/labels'
import { formatMoney } from '@/lib/core/money'
import { studentCategories, studentLevels } from '@/lib/core/types'
import { validate } from '@/lib/core/validation'
import { fullName, teacherName, type Course } from '@/lib/data/types'
import { useAppData } from '@/lib/data/provider'
import { priceCourseEnrollment } from '@/lib/payments/courses'
import { WEEKDAY_OPTIONS } from '../groups/group-form-drawer'

const toOptions = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }))

export function CourseFormDrawer({ course, onClose }: { course?: Course; onClose: () => void }) {
  const toast = useToast()
  const { actions, activeClubs, teachers, students, sessions, closures, coursePrices, catalog } = useAppData()
  const [values, setValues] = useState<CourseInput>(
    course
      ? {
          name: course.name,
          clubId: course.clubId,
          teacherId: course.teacherId,
          category: course.category,
          level: course.level,
          startsOn: course.startsOn,
          endsOn: course.endsOn,
          weekdays: course.weekdays,
          start: course.start,
          duration: course.duration,
          studentIds: course.studentIds,
        }
      : { ...emptyCourseInput, clubId: activeClubs[0]?.id ?? '' },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const teachersOf = (clubId: string) => teachers.filter((t) => t.active && t.clubIds.includes(clubId))
  const eligible = useMemo(() => students.filter((s) => s.active), [students])
  const otherCategory = students.filter(
    (s) => values.studentIds.includes(s.id) && s.category !== values.category,
  )

  const total = useMemo(() => {
    const enrolled = students.filter((s) => values.studentIds.includes(s.id))
    const accounts = [...new Set(enrolled.map((s) => s.accountId))]
    return accounts.reduce((sum, accountId) => {
      const members = enrolled.filter((s) => s.accountId === accountId)
      const result = priceCourseEnrollment(
        members.map((s) => ({ id: s.id, birthDate: s.birthDate })),
        coursePrices,
        catalog.segments,
        values.startsOn || '2000-01-01',
      )
      return sum + result.prices.reduce((acc, p) => acc + p.amountCents, 0)
    }, 0)
  }, [students, values.studentIds, values.startsOn, coursePrices, catalog.segments])

  const patch = (changes: Partial<CourseInput>) => {
    const next = { ...values, ...changes }
    if ('clubId' in changes && !teachersOf(next.clubId).some((t) => t.id === next.teacherId))
      next.teacherId = ''
    setValues(next)
  }

  const submit = () => {
    const parsed = validate(courseSchema, values)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    const slots = generateCourseSlots(parsed.data, expandClosedDays(closures, values.clubId))
    if (slots.length === 0) {
      setErrors({ weekdays: 'Ningún día del curso cae en las fechas elegidas' })
      return
    }
    const conflicts = courseConflicts({
      teacherId: values.teacherId,
      category: values.category,
      slots,
      students: students.filter((s) => values.studentIds.includes(s.id)),
      existing: sessions.filter((s) => s.courseId !== course?.id),
    })
    if (Object.keys(conflicts).length) {
      setErrors(conflicts)
      return
    }
    if (course) actions.updateCourse(course.id, parsed.data)
    else actions.createCourse(parsed.data)
    toast(course ? 'Curso actualizado.' : 'Curso creado. Sus clases ya aparecen en el calendario.')
    onClose()
  }

  return (
    <FormDrawer
      open
      title={course ? 'Editar curso' : 'Nuevo curso'}
      description="Un curso cerrado con fechas propias y un único pago, como el intensivo de verano."
      submitLabel={course ? 'Guardar cambios' : 'Crear curso'}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        id="course-name"
        label="Nombre"
        placeholder="Intensivo de junio · niños"
        value={values.name}
        error={errors.name}
        onChange={(e) => patch({ name: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Sede"
          value={values.clubId}
          error={errors.clubId}
          onChange={(v) => patch({ clubId: v })}
          options={activeClubs.map((c) => ({ value: c.id, label: c.name }))}
        />
        <SelectField
          label="Profesor"
          placeholder="Elige un profesor"
          value={values.teacherId}
          error={errors.teacherId}
          onChange={(v) => patch({ teacherId: v })}
          options={teachersOf(values.clubId).map((t) => ({ value: t.id, label: teacherName(t) }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Categoría"
          value={values.category}
          onChange={(v) => patch({ category: v as CourseInput['category'] })}
          options={toOptions(studentCategories, categoryLabels)}
        />
        <SelectField
          label="Nivel"
          value={values.level}
          onChange={(v) => patch({ level: v as CourseInput['level'] })}
          options={toOptions(studentLevels, levelLabels)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="course-starts"
          type="date"
          label="Empieza el"
          value={values.startsOn}
          error={errors.startsOn}
          onChange={(e) => patch({ startsOn: e.target.value })}
        />
        <TextField
          id="course-ends"
          type="date"
          label="Termina el"
          value={values.endsOn}
          error={errors.endsOn}
          onChange={(e) => patch({ endsOn: e.target.value })}
        />
      </div>
      <MultiSelectField
        label="Días de la semana"
        value={values.weekdays.map(String)}
        error={errors.weekdays}
        onChange={(days) => patch({ weekdays: days.map(Number).sort() })}
        options={WEEKDAY_OPTIONS}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="course-start"
          type="time"
          label="Hora"
          value={values.start}
          error={errors.start}
          onChange={(e) => patch({ start: e.target.value })}
        />
        <SelectField
          label="Duración"
          value={String(values.duration)}
          onChange={(v) => patch({ duration: Number(v) as 60 | 90 })}
          options={[
            { value: '60', label: '60 min' },
            { value: '90', label: '90 min' },
          ]}
        />
      </div>
      <MultiComboboxField
        label="Alumnos inscritos"
        max={defaultCapacity[values.category]}
        value={values.studentIds}
        error={errors.studentIds}
        onChange={(ids) => setValues((v) => ({ ...v, studentIds: ids }))}
        placeholder="Inscribir alumno…"
        options={eligible
          .map((s) => ({
            value: s.id,
            label: fullName(s),
            section:
              s.category !== values.category
                ? 'Otra categoría'
                : s.clubId === values.clubId || s.extraClubIds.includes(values.clubId)
                  ? 'De esta sede'
                  : 'De otras sedes',
          }))
          .sort((a, b) => a.section.localeCompare(b.section))}
      />
      <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
        Importe total de la inscripción:{' '}
        <span className="font-semibold text-foreground">{formatMoney(total)}</span>. Se suma al cobro del mes
        en que empieza el curso, con las ofertas de familia que apliquen.
      </p>
      {otherCategory.length > 0 ? (
        <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
          Este curso mezcla categorías: {otherCategory.map(fullName).join(', ')}{' '}
          {otherCategory.length === 1 ? 'es de' : 'son de'} otra categoría que el curso.
        </p>
      ) : null}
    </FormDrawer>
  )
}
