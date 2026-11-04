'use client'

import { useMemo, useState } from 'react'
import { FormDrawer } from '@/components/crud/form-drawer'
import { SelectField, TextField } from '@/components/ds/field'
import { MultiComboboxField } from '@/components/ds/multi-combobox'
import { useToast } from '@/components/ds/toast'
import { defaultCapacity } from '@/lib/classes/capacity'
import { emptyGroupInput, groupConflicts, groupSchema, type GroupInput } from '@/lib/classes/group-schema'
import { categoryLabels, levelLabels } from '@/lib/core/labels'
import { studentCategories, studentLevels } from '@/lib/core/types'
import { validate } from '@/lib/core/validation'
import { fullName, teacherName, type Group } from '@/lib/data/types'
import { useAppData } from '@/lib/data/provider'

export const WEEKDAY_OPTIONS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(
  (label, index) => ({
    value: String(index + 1),
    label,
  }),
)
const toOptions = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }))

export function GroupFormDrawer({ group, onClose }: { group?: Group; onClose: () => void }) {
  const toast = useToast()
  const { actions, activeClubs, teachers, students, groups } = useAppData()
  const [values, setValues] = useState<GroupInput>(
    group
      ? {
          name: group.name,
          clubId: group.clubId,
          teacherId: group.teacherId,
          category: group.category,
          level: group.level,
          weekday: group.weekday,
          start: group.start,
          duration: group.duration,
          startsOn: group.startsOn,
          endsOn: group.endsOn,
          studentIds: group.studentIds,
        }
      : {
          ...emptyGroupInput,
          clubId: activeClubs[0]?.id ?? '',
          startsOn: new Date().toISOString().slice(0, 10),
        },
  )
  const [regenerate, setRegenerate] = useState('future')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const teachersOf = (clubId: string) => teachers.filter((t) => t.active && t.clubIds.includes(clubId))
  const eligible = useMemo(() => students.filter((s) => s.active), [students])
  const otherCategory = students.filter(
    (s) => values.studentIds.includes(s.id) && s.category !== values.category,
  )

  const patch = (changes: Partial<GroupInput>) => {
    const next = { ...values, ...changes }
    if ('clubId' in changes && !teachersOf(next.clubId).some((t) => t.id === next.teacherId))
      next.teacherId = ''
    setValues(next)
  }

  const submit = () => {
    const parsed = validate(groupSchema, values)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    const conflicts = groupConflicts({
      groupId: group?.id,
      teacherId: values.teacherId,
      weekday: values.weekday,
      start: values.start,
      duration: values.duration,
      category: values.category,
      students: students.filter((s) => values.studentIds.includes(s.id)),
      others: groups,
    })
    if (Object.keys(conflicts).length) {
      setErrors(conflicts)
      return
    }
    if (group) actions.updateGroup(group.id, parsed.data, { regenerate: regenerate === 'future' })
    else actions.createGroup(parsed.data)
    toast(group ? 'Grupo actualizado.' : 'Grupo creado. Sus clases ya aparecen en el calendario.')
    onClose()
  }

  return (
    <FormDrawer
      open
      title={group ? 'Editar grupo' : 'Nuevo grupo'}
      submitLabel={group ? 'Guardar cambios' : 'Crear grupo'}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        id="group-name"
        label="Nombre"
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
          onChange={(v) => patch({ category: v as GroupInput['category'] })}
          options={toOptions(studentCategories, categoryLabels)}
        />
        <SelectField
          label="Nivel"
          value={values.level}
          onChange={(v) => patch({ level: v as GroupInput['level'] })}
          options={toOptions(studentLevels, levelLabels)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <SelectField
          label="Día"
          value={String(values.weekday)}
          onChange={(v) => patch({ weekday: Number(v) })}
          options={WEEKDAY_OPTIONS}
        />
        <TextField
          id="group-start"
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
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="group-starts"
          type="date"
          label="Empieza el"
          value={values.startsOn}
          error={errors.startsOn}
          onChange={(e) => patch({ startsOn: e.target.value })}
        />
        <TextField
          id="group-ends"
          type="date"
          label="Termina el (opcional)"
          value={values.endsOn}
          error={errors.endsOn}
          onChange={(e) => patch({ endsOn: e.target.value })}
        />
      </div>
      <MultiComboboxField
        label="Alumnos"
        max={defaultCapacity[values.category]}
        value={values.studentIds}
        error={errors.studentIds}
        onChange={(ids) => setValues((v) => ({ ...v, studentIds: ids }))}
        placeholder="Añadir alumno…"
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
      {otherCategory.length > 0 ? (
        <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
          Este grupo mezcla categorías: {otherCategory.map(fullName).join(', ')}{' '}
          {otherCategory.length === 1 ? 'es de' : 'son de'} otra categoría que el grupo.
        </p>
      ) : null}
      {group ? (
        <SelectField
          label="Aplicar los cambios al calendario"
          value={regenerate}
          onChange={setRegenerate}
          options={[
            { value: 'future', label: 'Solo a las clases futuras pendientes' },
            { value: 'none', label: 'No cambiar las clases ya creadas' },
          ]}
        />
      ) : null}
    </FormDrawer>
  )
}
