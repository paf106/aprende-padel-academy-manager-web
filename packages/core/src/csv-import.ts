import { studentLevels, type StudentCategory, type StudentLevel } from './index'

export const studentCsvHeader = [
  'nombre',
  'apellidos',
  'nacimiento',
  'genero',
  'categoria',
  'nivel',
  'sede',
] as const

export type ImportedStudent = {
  firstName: string
  lastName: string
  birthDate: string
  gender: 'female' | 'male' | 'other' | 'unspecified'
  category: StudentCategory
  level: StudentLevel
  club: string
}
export type ImportRow = { row: number; data?: ImportedStudent; errors: string[] }

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
const stripAccents = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '')

export function parseStudentsCsv(text: string, knownClubs: readonly string[]): ImportRow[] {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
  if (lines.length === 0) return []
  const delimiter = lines[0].includes(';') ? ';' : ','
  const header = lines[0].split(delimiter).map((h) => stripAccents(h.trim().toLowerCase()))
  const missing = studentCsvHeader.filter((h) => !header.includes(h))
  if (missing.length) return [{ row: 1, errors: [`Faltan columnas: ${missing.join(', ')}`] }]
  const clubs = new Map(knownClubs.map((c) => [stripAccents(c.toLowerCase()), c]))

  return lines.slice(1).map((line, index) => {
    const cells = line.split(delimiter).map((c) => c.trim())
    const get = (key: (typeof studentCsvHeader)[number]) => cells[header.indexOf(key)] ?? ''
    const errors: string[] = []
    const firstName = get('nombre')
    const lastName = get('apellidos')
    if (!firstName) errors.push('Falta el nombre')
    if (!lastName) errors.push('Faltan los apellidos')
    const birthDate = get('nacimiento')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate)))
      errors.push('Fecha de nacimiento inválida (AAAA-MM-DD)')
    const gender = genders[stripAccents(get('genero').toLowerCase())]
    if (!gender) errors.push('Género no reconocido')
    const category = categories[stripAccents(get('categoria').toLowerCase())]
    if (!category) errors.push('Categoría no reconocida (adulto o niño)')
    const level = stripAccents(get('nivel').toLowerCase()) as StudentLevel
    if (!studentLevels.includes(level)) errors.push('Nivel no reconocido')
    const club = clubs.get(stripAccents(get('sede').toLowerCase()))
    if (!club) errors.push(`Sede desconocida: ${get('sede') || '(vacía)'}`)
    const row = index + 2
    if (errors.length || !gender || !category || !club) return { row, errors }
    return { row, errors, data: { firstName, lastName, birthDate, gender, category, level, club } }
  })
}

export function studentCsvTemplate() {
  return [
    studentCsvHeader.join(';'),
    'Ana;García López;1990-05-12;F;adulto;medio;Pioz',
    'Hugo;Pérez Ruiz;2015-03-02;M;niño;iniciacion;Corpa',
  ].join('\n')
}
