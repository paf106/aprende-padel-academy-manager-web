'use client'

import { useState } from 'react'
import { FormDrawer } from '@/components/crud/form-drawer'
import { MultiSelectField, TextField } from '@/components/ds/field'
import { useToast } from '@/components/ds/toast'
import { emptyTeacherInput, teacherSchema, type TeacherInput } from '@/lib/classes/teacher-schema'
import { validate } from '@/lib/core/validation'
import { clubs, type Teacher } from '@/lib/demo/data'
import { useDemo } from '@/lib/demo/use-demo'

const clubOptions = clubs.map((club) => ({ value: club.id, label: club.name }))

export function TeacherFormDrawer({ teacher, onClose }: { teacher?: Teacher; onClose: () => void }) {
  const toast = useToast()
  const { actions } = useDemo()
  const [values, setValues] = useState<TeacherInput>(
    teacher
      ? {
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.email,
          phone: teacher.phone,
          clubIds: teacher.clubIds,
        }
      : emptyTeacherInput,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof TeacherInput>(key: K, value: TeacherInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = () => {
    const result = validate(teacherSchema, values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    if (teacher) actions.updateTeacher(teacher.id, result.data)
    else actions.createTeacher(result.data)
    toast(teacher ? 'Profesor actualizado.' : 'Profesor creado.')
    onClose()
  }

  return (
    <FormDrawer
      open
      title={teacher ? 'Editar profesor' : 'Nuevo profesor'}
      submitLabel={teacher ? 'Guardar cambios' : 'Crear profesor'}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="first-name"
          label="Nombre"
          value={values.firstName}
          error={errors.firstName}
          onChange={(e) => set('firstName', e.target.value)}
        />
        <TextField
          id="last-name"
          label="Apellidos"
          value={values.lastName}
          error={errors.lastName}
          onChange={(e) => set('lastName', e.target.value)}
        />
      </div>
      <TextField
        id="email"
        type="email"
        label="Email"
        value={values.email}
        error={errors.email}
        onChange={(e) => set('email', e.target.value)}
      />
      <TextField
        id="phone"
        type="tel"
        label="Teléfono"
        value={values.phone}
        error={errors.phone}
        onChange={(e) => set('phone', e.target.value)}
      />
      <MultiSelectField
        label="Sedes donde imparte"
        value={values.clubIds}
        error={errors.clubIds}
        onChange={(v) => set('clubIds', v)}
        options={clubOptions}
      />
    </FormDrawer>
  )
}
