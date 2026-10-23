import { describe, expect, it } from 'vitest'
import { parseStudentsCsv, studentCsvTemplate } from './csv-import'

const clubs = ['Pioz', 'Corpa']

describe('importación CSV de alumnos', () => {
  it('acepta la plantilla descargable', () => {
    const rows = parseStudentsCsv(studentCsvTemplate(), clubs)
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.errors.length === 0)).toBe(true)
    expect(rows[1].data).toMatchObject({ category: 'child', level: 'iniciacion', club: 'Corpa' })
  })
  it('informa de la fila y el motivo de cada error', () => {
    const csv =
      'nombre;apellidos;nacimiento;genero;categoria;nivel;sede\n;Gómez;12/05/1990;F;adulto;experto;Lugo'
    const [row] = parseStudentsCsv(csv, clubs)
    expect(row.row).toBe(2)
    expect(row.data).toBeUndefined()
    expect(row.errors).toHaveLength(4)
  })
  it('avisa si faltan columnas', () => {
    expect(parseStudentsCsv('nombre;apellidos\nAna;García', clubs)[0].errors[0]).toMatch(/Faltan columnas/)
  })
  it('acepta coma como separador y sede sin acentos', () => {
    const csv =
      'nombre,apellidos,nacimiento,genero,categoria,nivel,sede\nLuis,Mora,1985-01-01,M,adulto,avanzado,pioz'
    expect(parseStudentsCsv(csv, clubs)[0].errors).toEqual([])
  })
})
