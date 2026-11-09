'use client'

import { Download, FileUp } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { parseStudentsCsv, studentCsvTemplate, type ImportRow } from '@/lib/classes/csv-import'
import { emptyStudentInput } from '@/lib/classes/student-schema'
import { Badge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { BentoCard, BentoGrid, Card, Stat } from '@/components/ds/card'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { PageContainer, PageToolbar } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import { useAppData } from '@/lib/data/provider'

export function ImportView() {
  const toast = useToast()
  const { activeClubs: clubs, students, actions } = useAppData()
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [imported, setImported] = useState(0)
  const valid = rows?.filter((r) => r.errors.length === 0) ?? []
  const invalid = rows?.filter((r) => r.errors.length > 0) ?? []

  const downloadTemplate = () => {
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + studentCsvTemplate(clubs[0]?.name)], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla-alumnos.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageContainer>
      <PageToolbar
        title="Importar alumnos"
        actions={
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download size={16} aria-hidden="true" />
            Descargar plantilla
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        Sube un CSV (exportado desde Excel), revisa la vista previa y confirma.
      </p>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-input bg-card px-6 py-10 text-center transition-colors hover:border-brand">
        <FileUp size={24} aria-hidden="true" className="text-brand" />
        <span className="font-medium">{fileName || 'Elige un archivo CSV'}</span>
        <span className="text-sm text-muted-foreground">
          Obligatorias: nombre, nacimiento, categoria, nivel, sede. Opcionales: apellidos, genero, telefono,
          email, tutor, telefono_tutor
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setFileName(file.name)
            setRows(
              parseStudentsCsv(
                await file.text(),
                clubs.map((c) => c.name),
                students,
              ),
            )
          }}
        />
      </label>

      {imported > 0 && !rows ? (
        <p className="text-sm">
          {imported} alumnos importados.{' '}
          <Link href="/students" className="font-medium text-brand">
            Ver alumnos
          </Link>
        </p>
      ) : null}

      {rows ? (
        <>
          <BentoGrid>
            <BentoCard span="md">
              <Stat value={rows.length} label="Filas leídas" />
            </BentoCard>
            <BentoCard span="md">
              <Stat value={valid.length} label="Listas para importar" />
            </BentoCard>
            <BentoCard span="md">
              <Stat value={invalid.length} label="Con errores" hint="No se importarán" />
            </BentoCard>
          </BentoGrid>
          <Card>
            <DataTable
              rows={rows}
              rowKey={(r) => String(r.row)}
              empty={<EmptyState icon={FileUp} title="El archivo está vacío" />}
              columns={[
                { key: 'row', header: 'Fila', cell: (r) => r.row },
                {
                  key: 'name',
                  header: 'Alumno',
                  cell: (r) => (r.data ? `${r.data.firstName} ${r.data.lastName}` : '—'),
                },
                { key: 'club', header: 'Sede', cell: (r) => r.data?.club ?? '—' },
                {
                  key: 'state',
                  header: 'Estado',
                  cell: (r) =>
                    r.errors.length ? (
                      <span className="text-danger">{r.errors.join(' · ')}</span>
                    ) : (
                      <Badge tone="brand">Correcta</Badge>
                    ),
                },
              ]}
            />
          </Card>
          <div className="flex justify-end">
            <Button
              disabled={valid.length === 0}
              onClick={() => {
                const items = valid.flatMap((row) => {
                  const data = row.data
                  const club = data && clubs.find((c) => c.name === data.club)
                  if (!data || !club) return []
                  return [
                    {
                      needsReview: data.needsReview,
                      input: {
                        ...emptyStudentInput,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        birthDate: data.birthDate,
                        gender: data.gender,
                        category: data.category,
                        level: data.level,
                        clubId: club.id,
                        email: data.email,
                        phone: data.phone,
                        guardianName: data.guardianName,
                        guardianPhone: data.guardianPhone,
                      },
                    },
                  ]
                })
                actions.importStudents(items)
                setImported(items.length)
                setRows(null)
                setFileName('')
                toast(`${items.length} alumnos importados.`)
              }}
            >
              Importar {valid.length} alumnos
            </Button>
          </div>
        </>
      ) : null}
    </PageContainer>
  )
}
