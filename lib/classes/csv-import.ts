import { emptyStudentInput, studentSchema, type StudentInput } from '@/lib/classes/student-schema'
import type { StudentCategory, StudentLevel } from '@/lib/core/types'
import { validate } from '@/lib/core/validation'

/** Columns the file must have; the others are optional. */
export const studentCsvRequired = ['nombre', 'nacimiento', 'categoria', 'nivel', 'sede'] as const
export const studentCsvHeader = [
  'nombre',
  'apellidos',
  'nacimiento',
  'genero',
  'categoria',
  'nivel',
  'sede',
  'telefono',
  'email',
  'tutor',
  'telefono_tutor',
] as const

export const PENDING_GUARDIAN = 'Pendiente de completar'

export type ImportedStudent = {
  firstName: string
  lastName: string
  birthDate: string
  gender: 'female' | 'male' | 'other' | 'unspecified'
  category: StudentCategory
  level: StudentLevel
  /** Name of the club, as written in the file (matched without accents or capitals). */
  club: string
  email: string
  phone: string
  guardianName: string
  guardianPhone: string
  /** Part of the data was filled with defaults (no guardian for a child, no level). */
  needsReview: boolean
}
export type ImportRow = { row: number; data?: ImportedStudent; errors: string[] }
export type ExistingStudent = { firstName: string; lastName: string; birthDate: string }

const genders: Record<string, ImportedStudent['gender']> = {
  f: 'female',
  femenino: 'female',
  m: 'male',
  masculino: 'male',
  otro: 'other',
  '': 'unspecified',
}
const categories: Record<string, StudentCategory> = {
  adulto: 'adult',
  adultos: 'adult',
  nino: 'child',
  niño: 'child',
  infantil: 'child',
}
const levels: Record<string, StudentLevel> = {
  iniciacion: 'starter',
  principiante: 'beginner',
  medio: 'intermediate',
  avanzado: 'advanced',
  competicion: 'competition',
}
const stripAccents = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '')
const normalize = (value: string) => stripAccents(value.trim().toLowerCase())
const identity = (s: ExistingStudent) => `${normalize(s.firstName)}|${normalize(s.lastName)}|${s.birthDate}`

export function parseStudentsCsv(
  text: string,
  knownClubs: readonly string[],
  existing: readonly ExistingStudent[] = [],
): ImportRow[] {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
  if (lines.length === 0) return []
  const delimiter = lines[0].includes(';') ? ';' : ','
  const header = lines[0].split(delimiter).map((h) => normalize(h))
  const missing = studentCsvRequired.filter((h) => !header.includes(h))
  if (missing.length) return [{ row: 1, errors: [`Faltan columnas: ${missing.join(', ')}`] }]
  const clubs = new Map(knownClubs.map((c) => [normalize(c), c]))
  const seen = new Set(existing.map(identity))

  return lines.slice(1).map((line, index) => {
    const cells = line.split(delimiter).map((c) => c.trim())
    const get = (key: (typeof studentCsvHeader)[number]) => cells[header.indexOf(key)] ?? ''
    const errors: string[] = []
    const row = index + 2

    const gender = genders[normalize(get('genero'))]
    if (!gender) errors.push('Género no reconocido')
    const category = categories[normalize(get('categoria'))]
    if (!category) errors.push('Categoría no reconocida (adulto o niño)')
    const levelText = normalize(get('nivel'))
    const level = levelText === '' ? 'starter' : levels[levelText]
    if (!level) errors.push('Nivel no reconocido')
    const club = clubs.get(normalize(get('sede')))
    if (!club) errors.push(`Sede desconocida: ${get('sede') || '(vacía)'}`)

    const childWithoutGuardian = category === 'child' && !get('tutor')
    const input: StudentInput = {
      ...emptyStudentInput,
      firstName: get('nombre'),
      lastName: get('apellidos'),
      birthDate: get('nacimiento'),
      gender: gender ?? 'unspecified',
      category: category ?? 'adult',
      level: level ?? 'starter',
      clubId: club ?? 'x',
      email: get('email'),
      phone: get('telefono'),
      guardianName: childWithoutGuardian ? PENDING_GUARDIAN : get('tutor'),
      guardianPhone: get('telefono_tutor'),
    }
    const checked = validate(studentSchema, input)
    if (!checked.ok) {
      for (const [field, message] of Object.entries(checked.errors))
        if (field !== 'clubId') errors.push(message)
    }

    if (errors.length === 0) {
      const key = identity(input)
      if (seen.has(key)) errors.push('Ya existe un alumno con ese nombre y fecha de nacimiento')
      else seen.add(key)
    }
    if (errors.length || !gender || !category || !club || !level) return { row, errors }
    return {
      row,
      errors,
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        birthDate: input.birthDate,
        gender,
        category,
        level,
        club,
        email: input.email,
        phone: input.phone,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        needsReview: childWithoutGuardian || levelText === '',
      },
    }
  })
}

export function studentCsvTemplate(clubName = 'Pioz') {
  return [
    studentCsvHeader.join(';'),
    `Ana;García López;1990-05-12;F;adulto;medio;${clubName};600111222;ana@correo.es;;`,
    `Hugo;Pérez Ruiz;2015-03-02;M;niño;iniciacion;${clubName};;;María Ruiz;600333444`,
  ].join('\n')
}
