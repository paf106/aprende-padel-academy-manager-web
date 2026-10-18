import { getSupabaseServer } from '@aprende-padel/db/server'
import { StudentForm } from './student-form'
import { deactivateStudent } from './actions'
import { StudentEditForm } from './student-edit-form'
import { StudentTariffForm } from './tariff-form'
import { DeactivateAction } from '../../../components/deactivate-action'
import Link from 'next/link'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { PageHeader } from '../../../components/ui/page-header'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = '', page: rawPage } = await searchParams
  const page = Math.max(1, Number.isInteger(Number(rawPage)) ? Number(rawPage) : 1)
  const pageSize = 50
  const db = await getSupabaseServer()
  let studentQuery = db
    .schema('core')
    .from('students')
    .select('id,first_name,last_name,category,level,club_id,active,email,phone', { count: 'exact' })
    .eq('active', true)
    .order('last_name')
  const safeQuery = q.trim().replace(/[(),]/g, ' ')
  if (safeQuery)
    studentQuery = studentQuery.or(`first_name.ilike.%${safeQuery}%,last_name.ilike.%${safeQuery}%`)
  studentQuery = studentQuery.range((page - 1) * pageSize, page * pageSize - 1)
  const [{ data: students, error, count }, { data: clubs }, { data: tariffs }] = await Promise.all([
    studentQuery,
    db.schema('core').from('clubs').select('id,name').eq('active', true).order('name'),
    db
      .schema('payments')
      .from('tariffs')
      .select('id,name,category,monthly_amount_cents')
      .eq('active', true)
      .order('name'),
  ])
  if (error) throw new Error('No se pudo cargar el alumnado')
  const studentIds = (students ?? []).map((student) => student.id)
  const { data: assignments } = studentIds.length
    ? await db
        .schema('payments')
        .from('student_tariffs')
        .select('student_id,tariff_id')
        .is('ends_on', null)
        .in('student_id', studentIds)
    : { data: [] }
  const clubMap = new Map((clubs ?? []).map((club) => [club.id, club.name]))
  const currentTariff = new Map(
    (assignments ?? []).map((assignment) => [assignment.student_id, assignment.tariff_id]),
  )
  const rows = students ?? []
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <PageHeader
        title="Alumnos"
        description={`${new Intl.NumberFormat('es-ES').format(count ?? 0)} ${q ? 'resultados' : count === 1 ? 'alumno activo' : 'alumnos activos'}`}
        actions={<StudentForm clubs={clubs ?? []} tariffs={tariffs ?? []} />}
      />
      <form role="search" aria-label="Buscar alumnos" className="mb-4 flex gap-2">
        <label className="sr-only" htmlFor="student-search">
          Buscar por nombre o apellido
        </label>
        <Input
          id="student-search"
          type="search"
          autoComplete="off"
          spellCheck={false}
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o apellido…"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>
      <section
        role="list"
        aria-label="Alumnado activo"
        className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
      >
        {rows.map((student) => (
          <article
            role="listitem"
            className="grid min-w-0 gap-3 border-b border-slate-200 p-4 last:border-0 sm:grid-cols-[1.1fr_1fr_auto] sm:items-center"
            key={student.id}
          >
            <div className="min-w-0">
              <strong className="block break-words text-sm">
                {student.first_name} {student.last_name}
              </strong>
              <p className="mt-1 break-words text-xs text-slate-600">
                {clubMap.get(student.club_id) ?? 'Club'} ·{' '}
                {student.category === 'adult' ? 'Adultos' : 'Infantil'} · {student.level}
              </p>
            </div>
            <p className="min-w-0 break-words text-xs text-slate-600">
              {[student.email, student.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
            </p>
            <div className="flex flex-wrap gap-2">
              <StudentEditForm student={student} />
              <StudentTariffForm
                studentId={student.id}
                category={student.category}
                tariffs={tariffs ?? []}
                current={currentTariff.get(student.id)}
              />
              <DeactivateAction
                label="este alumno"
                action={async () => {
                  'use server'
                  return deactivateStudent(student.id)
                }}
              />
            </div>
          </article>
        ))}
        {!rows.length ? (
          <p className="p-8 text-center text-sm text-slate-600">
            {q ? 'No hay alumnos para esa búsqueda.' : 'Todavía no hay alumnos activos.'}
          </p>
        ) : null}
      </section>
      {(count ?? 0) > pageSize ? (
        <nav aria-label="Paginación de alumnos" className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Página {page} de {Math.ceil((count ?? 0) / pageSize)}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-400 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-100"
                href={`/alumnos?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}
              >
                Anterior
              </Link>
            ) : null}
            {page < Math.ceil((count ?? 0) / pageSize) ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-400 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-100"
                href={`/alumnos?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}
              >
                Siguiente
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </main>
  )
}
