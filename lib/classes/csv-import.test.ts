import { describe, expect, it } from 'vitest'
import { parseStudentsCsv, PENDING_GUARDIAN, studentCsvTemplate } from '@/lib/classes/csv-import'

const clubs = ['Pioz', 'Corpa']
const header = 'nombre;apellidos;nacimiento;genero;categoria;nivel;sede;telefono;email;tutor;telefono_tutor'

describe('student CSV import', () => {
  it('accepts the downloadable template with the club of the organization', () => {
    const rows = parseStudentsCsv(studentCsvTemplate('Corpa'), clubs)
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.errors.length === 0)).toBe(true)
    expect(rows[1].data).toMatchObject({
      category: 'child',
      level: 'starter',
      club: 'Corpa',
      guardianName: 'María Ruiz',
    })
    expect(rows[0].data).toMatchObject({ email: 'ana@correo.es', phone: '600111222', needsReview: false })
  })

  it('reports the row and reason for each error', () => {
    const csv = `${header}\n;Gómez;12/05/1990;F;adulto;experto;Lugo;;;;`
    const [row] = parseStudentsCsv(csv, clubs)
    expect(row.row).toBe(2)
    expect(row.data).toBeUndefined()
    expect(row.errors.length).toBeGreaterThanOrEqual(4)
    expect(row.errors).toContain('Sede desconocida: Lugo')
  })

  it('warns about missing required columns only', () => {
    expect(parseStudentsCsv('nombre;apellidos\nAna;García', clubs)[0].errors[0]).toMatch(
      /Faltan columnas: nacimiento/,
    )
    const minimal = 'nombre;nacimiento;categoria;nivel;sede\nAna;1990-05-12;adulto;medio;Pioz'
    expect(parseStudentsCsv(minimal, clubs)[0].errors).toEqual([])
  })

  it('does not need a last name', () => {
    const csv = `${header}\nDenisa;;1990-05-12;F;adulto;principiante;Pioz;664153212;;;`
    const [row] = parseStudentsCsv(csv, clubs)
    expect(row.errors).toEqual([])
    expect(row.data).toMatchObject({ firstName: 'Denisa', lastName: '' })
  })

  it('imports a child without guardian as pending to complete', () => {
    const csv = `${header}\nHugo;;2016-01-01;M;niño;iniciacion;Pioz;;;;`
    const [row] = parseStudentsCsv(csv, clubs)
    expect(row.errors).toEqual([])
    expect(row.data).toMatchObject({ guardianName: PENDING_GUARDIAN, needsReview: true })
  })

  it('fills an empty level with the starter one and asks to review', () => {
    const csv = `${header}\nLuis;Mora;1985-01-01;M;adulto;;Pioz;;;;`
    expect(parseStudentsCsv(csv, clubs)[0].data).toMatchObject({ level: 'starter', needsReview: true })
  })

  it('applies the same checks as the student form: email and future birth dates', () => {
    const csv = `${header}\nAna;Gil;1990-05-12;F;adulto;medio;Pioz;;no-es-email;;\nLuis;Mora;2999-01-01;M;adulto;medio;Pioz;;;;`
    const rows = parseStudentsCsv(csv, clubs)
    expect(rows[0].errors.join(' ')).toMatch(/email/i)
    expect(rows[1].errors.join(' ')).toMatch(/Fecha no válida/)
  })

  it('accepts comma separators and unaccented club names', () => {
    const csv =
      'nombre,apellidos,nacimiento,genero,categoria,nivel,sede\nLuis,Mora,1985-01-01,M,adulto,avanzado,pioz'
    expect(parseStudentsCsv(csv, clubs)[0].errors).toEqual([])
  })

  it('skips students that already exist or are repeated in the file', () => {
    const csv = `${header}\nAna;García;1990-05-12;F;adulto;medio;Pioz;;;;\nana;garcia;1990-05-12;F;adulto;medio;Pioz;;;;\nLuis;Mora;1985-01-01;M;adulto;medio;Pioz;;;;`
    const rows = parseStudentsCsv(csv, clubs, [
      { firstName: 'Luis', lastName: 'Mora', birthDate: '1985-01-01' },
    ])
    expect(rows[0].errors).toEqual([])
    expect(rows[1].errors).toEqual(['Ya existe un alumno con ese nombre y fecha de nacimiento'])
    expect(rows[2].errors).toEqual(['Ya existe un alumno con ese nombre y fecha de nacimiento'])
  })
})
