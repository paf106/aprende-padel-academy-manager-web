import { describe, expect, it } from 'vitest'
import { parseStudentsCsv, studentCsvTemplate } from '@/lib/classes/csv-import'

const clubs = ['Pioz', 'Corpa']

describe('student CSV import', () => {
  it('accepts the downloadable template', () => {
    const rows = parseStudentsCsv(studentCsvTemplate(), clubs)
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.errors.length === 0)).toBe(true)
    expect(rows[1].data).toMatchObject({ category: 'child', level: 'starter', club: 'Corpa' })
  })
  it('reports the row and reason for each error', () => {
    const csv =
      'nombre;apellidos;nacimiento;genero;categoria;nivel;sede\n;Gómez;12/05/1990;F;adulto;experto;Lugo'
    const [row] = parseStudentsCsv(csv, clubs)
    expect(row.row).toBe(2)
    expect(row.data).toBeUndefined()
    expect(row.errors).toHaveLength(4)
  })
  it('warns about missing columns', () => {
    expect(parseStudentsCsv('nombre;apellidos\nAna;García', clubs)[0].errors[0]).toMatch(/Faltan columnas/)
  })
  it('accepts comma separators and unaccented club names', () => {
    const csv =
      'nombre,apellidos,nacimiento,genero,categoria,nivel,sede\nLuis,Mora,1985-01-01,M,adulto,avanzado,pioz'
    expect(parseStudentsCsv(csv, clubs)[0].errors).toEqual([])
  })
})
