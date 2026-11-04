'use client'

import { useState } from 'react'
import { FormDrawer } from '@/components/crud/form-drawer'
import { MultiSelectField, SelectField, TextField } from '@/components/ds/field'
import { useToast } from '@/components/ds/toast'
import { emptyStudentInput, studentSchema, type StudentInput } from '@/lib/classes/student-schema'
import { categoryLabels, genderLabels, levelLabels } from '@/lib/core/labels'
import { studentCategories, studentGenders, studentLevels } from '@/lib/core/types'
import { validate } from '@/lib/core/validation'
import type { Student } from '@/lib/demo/data'
import { useDemo } from '@/lib/demo/use-demo'

const toOptions = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }))

export function StudentFormDrawer({ student, onClose }: { student?: Student; onClose: () => void }) {
  const toast = useToast()
  const { actions, activeClubs, accounts, students } = useDemo()
  const accountOptions = [
    { value: '', label: 'Cuenta individual nueva' },
    ...accounts.map((account) => {
      const members = students.filter((s) => s.accountId === account.id).length
      return {
        value: account.id,
        label: account.name,
        hint: `${members} ${members === 1 ? 'alumno' : 'alumnos'}`,
      }
    }),
  ]
  const clubOptions = activeClubs.map((club) => ({ value: club.id, label: club.name }))
  const [values, setValues] = useState<StudentInput>(
    student
      ? {
          firstName: student.firstName,
          lastName: student.lastName,
          birthDate: student.birthDate,
          gender: student.gender,
          category: student.category,
          level: student.level,
          clubId: student.clubId,
          extraClubIds: student.extraClubIds,
          email: student.email,
          phone: student.phone,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          accountId: student.accountId,
        }
      : emptyStudentInput,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof StudentInput>(key: K, value: StudentInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = () => {
    const result = validate(studentSchema, values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    if (student) actions.updateStudent(student.id, result.data)
    else actions.createStudent(result.data)
    toast(student ? 'Alumno actualizado.' : 'Alumno creado.')
    onClose()
  }

  return (
    <FormDrawer
      open
      title={student ? 'Editar alumno' : 'Nuevo alumno'}
      submitLabel={student ? 'Guardar cambios' : 'Crear alumno'}
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
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="birth-date"
          type="date"
          label="Fecha de nacimiento"
          value={values.birthDate}
          error={errors.birthDate}
          onChange={(e) => set('birthDate', e.target.value)}
        />
        <SelectField
          label="Género"
          value={values.gender}
          onChange={(v) => set('gender', v as StudentInput['gender'])}
          options={toOptions(studentGenders, genderLabels)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Categoría"
          value={values.category}
          onChange={(v) => set('category', v as StudentInput['category'])}
          options={toOptions(studentCategories, categoryLabels)}
        />
        <SelectField
          label="Nivel"
          value={values.level}
          onChange={(v) => set('level', v as StudentInput['level'])}
          options={toOptions(studentLevels, levelLabels)}
        />
      </div>
      <SelectField
        label="Sede habitual"
        placeholder="Elige una sede"
        value={values.clubId}
        error={errors.clubId}
        onChange={(v) => set('clubId', v)}
        options={clubOptions}
      />
      <SelectField
        label="Cuenta de cobro"
        value={values.accountId}
        onChange={(v) => set('accountId', v)}
        options={accountOptions}
      />
      <MultiSelectField
        label="Otras sedes donde puede asistir"
        value={values.extraClubIds}
        onChange={(v) => set('extraClubIds', v)}
        options={clubOptions.filter((option) => option.value !== values.clubId)}
      />
      <div className="grid grid-cols-2 gap-3">
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
          onChange={(e) => set('phone', e.target.value)}
        />
      </div>
      {values.category === 'child' ? (
        <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Tutor legal</legend>
          <TextField
            id="guardian-name"
            label="Nombre del tutor"
            value={values.guardianName}
            error={errors.guardianName}
            onChange={(e) => set('guardianName', e.target.value)}
          />
          <TextField
            id="guardian-phone"
            type="tel"
            label="Teléfono del tutor"
            value={values.guardianPhone}
            onChange={(e) => set('guardianPhone', e.target.value)}
          />
        </fieldset>
      ) : null}
    </FormDrawer>
  )
}
