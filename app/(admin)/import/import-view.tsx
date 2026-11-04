'use client'

import { Download, FileUp } from 'lucide-react'
import { useState } from 'react'
import { parseStudentsCsv, studentCsvTemplate, type ImportRow } from '@/lib/classes/csv-import'
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
  const { activeClubs: clubs } = useAppData()
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const valid = rows?.filter((r) => r.errors.length === 0) ?? []
  const invalid = rows?.filter((r) => r.errors.length > 0) ?? []

  const downloadTemplate = () => {
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + studentCsvTemplate()], { type: 'text/csv;charset=utf-8' }),
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
          Columnas: nombre, apellidos, nacimiento, genero, categoria, nivel, sede
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
              ),
            )
          }}
        />
      </label>

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
                toast(`${valid.length} alumnos listos. La importación se conectará con la base de datos.`)
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
