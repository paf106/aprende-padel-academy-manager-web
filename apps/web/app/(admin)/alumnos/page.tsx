import Link from 'next/link'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { PageHeader } from '../../../components/ui/page-header'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { requireAdmin } from '../../lib/auth'
import { getEnabledModules } from '../../lib/modules'
import { StudentForm } from './student-form'
import { StudentEditForm } from './student-edit-form'
import { StudentTariffForm } from './tariff-form'
import { StudentActiveAction } from './student-active-action'

const pageSize = 50
const studentLevelLabels = {
  iniciacion: 'Iniciación',
  principiante: 'Principiante',
  medio: 'Medio',
  avanzado: 'Avanzado',
  competicion: 'Competición',
} as const

type Filters = {
  q?: string
  page?: string
  club?: string
  category?: string
  level?: string
  status?: string
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)
  const rawPage = Number(params.page)
  let page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100_000) : 1
  const clubId = params.club && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(params.club) ? params.club : null
  const category = params.category === 'adult' || params.category === 'child' ? params.category : null
  const level = Object.hasOwn(studentLevelLabels, params.level ?? '')
    ? (params.level as keyof typeof studentLevelLabels)
    : null
  const status = params.status === 'inactive' || params.status === 'all' ? params.status : 'active'
  const active = status === 'all' ? null : status === 'active'
  const admin = await requireAdmin()
  const organizationId = admin.app_metadata.organization_id
  if (typeof organizationId !== 'string') throw new Error('No se pudo identificar la organización')
  const paymentsEnabled = (await getEnabledModules(organizationId)).includes('payments')
  const db = await getSupabaseServer()

  const searchStudents = (offset: number) =>
    db.schema('core').rpc('search_students', {
      p_search: q || null,
      p_club_id: clubId,
      p_category: category,
      p_level: level,
      p_active: active,
      p_limit: pageSize,
      p_offset: offset,
    })
  const [{ data: clubs, error: clubsError }, { data: tariffs, error: tariffsError }] = await Promise.all([
    db.schema('core').from('clubs').select('id,name').order('name'),
    paymentsEnabled
      ? db
          .schema('payments')
          .from('tariffs')
          .select('id,name,category,monthly_amount_cents,active')
          .order('name')
      : Promise.resolve({ data: [], error: null }),
  ])
  if (clubsError || tariffsError) throw new Error('No se pudieron cargar los filtros de alumnos')
  let { data: rows, error } = await searchStudents((page - 1) * pageSize)
  if (error) throw new Error('No se pudo cargar el alumnado')
  let count = Number(rows?.[0]?.total_count ?? 0)
  if (!rows?.length && page > 1) {
    page = 1
    const firstPage = await searchStudents(0)
    if (firstPage.error) throw new Error('No se pudo cargar el alumnado')
    rows = firstPage.data
    count = Number(rows?.[0]?.total_count ?? 0)
  }
  const studentIds = (rows ?? []).map((student) => student.id)
  const { data: assignments, error: assignmentsError } =
    paymentsEnabled && studentIds.length
      ? await db
          .schema('payments')
          .from('student_tariffs')
          .select('student_id,tariff_id')
          .is('ends_on', null)
          .in('student_id', studentIds)
      : { data: [], error: null }
  if (assignmentsError) throw new Error('No se pudieron cargar las tarifas actuales')
  const clubNames = new Map((clubs ?? []).map((club) => [club.id, club.name]))
  const tariffsById = new Map((tariffs ?? []).map((tariff) => [tariff.id, tariff]))
  const tariffByStudent = new Map(
    (assignments ?? []).map((assignment) => [assignment.student_id, tariffsById.get(assignment.tariff_id)]),
  )
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const filterValues = {
    ...(q ? { q } : {}),
    ...(clubId ? { club: clubId } : {}),
    ...(category ? { category } : {}),
    ...(level ? { level } : {}),
    ...(status !== 'active' ? { status } : {}),
  }
  const paginationHref = (targetPage: number) => {
    const query = new URLSearchParams({ ...filterValues, page: String(targetPage) })
    return `/alumnos?${query.toString()}`
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <PageHeader
        title="Alumnos"
        description={`${new Intl.NumberFormat('es-ES').format(count)} ${status === 'inactive' ? 'inactivos' : status === 'all' ? 'alumnos' : count === 1 ? 'alumno activo' : 'alumnos activos'}`}
        actions={
          <StudentForm clubs={clubs ?? []} tariffs={tariffs ?? []} paymentsEnabled={paymentsEnabled} />
        }
      />
      <form
        role="search"
        aria-label="Buscar y filtrar alumnos"
        method="get"
        className="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.5fr)_repeat(4,minmax(140px,1fr))_auto]"
      >
        <label className="sr-only" htmlFor="student-search">
          Buscar por nombre y apellido
        </label>
        <Input
          id="student-search"
          type="search"
          autoComplete="off"
          spellCheck={false}
          name="q"
          defaultValue={q}
          placeholder="Buscar nombre o apellido…"
          className="min-w-0"
        />
        <label className="sr-only" htmlFor="student-club">
          Filtrar por club
        </label>
        <Select id="student-club" name="club" defaultValue={clubId ?? ''} aria-label="Filtrar por club">
          <option value="">Todos los clubes</option>
          {(clubs ?? []).map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="student-category">
          Filtrar por categoría
        </label>
        <Select
          id="student-category"
          name="category"
          defaultValue={category ?? ''}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          <option value="adult">Adultos</option>
          <option value="child">Infantil</option>
        </Select>
        <label className="sr-only" htmlFor="student-level">
          Filtrar por nivel
        </label>
        <Select id="student-level" name="level" defaultValue={level ?? ''} aria-label="Filtrar por nivel">
          <option value="">Todos los niveles</option>
          {Object.entries(studentLevelLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="student-status">
          Filtrar por estado
        </label>
        <Select id="student-status" name="status" defaultValue={status} aria-label="Filtrar por estado">
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="all">Todos</option>
        </Select>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
      </form>

      <section
        role="list"
        aria-label={status === 'inactive' ? 'Alumnado inactivo' : 'Alumnado'}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        {(rows ?? []).map((student) => {
          const tariff = tariffByStudent.get(student.id)
          const fullName = `${student.first_name} ${student.last_name}`
          return (
            <article
              role="listitem"
              className="grid min-w-0 gap-3 border-b border-slate-100 p-4 last:border-0 sm:grid-cols-[1.1fr_1fr_auto] sm:items-center"
              key={student.id}
            >
              <div className="min-w-0">
                <strong className="block break-words text-sm">{fullName}</strong>
                <p className="mt-1 break-words text-xs text-slate-600">
                  {clubNames.get(student.club_id) ?? 'Club'} ·{' '}
                  {student.category === 'adult' ? 'Adultos' : 'Infantil'} ·{' '}
                  {studentLevelLabels[student.level]}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {paymentsEnabled ? (tariff?.name ?? 'Sin tarifa asignada') : null}
                </p>
              </div>
              <p className="min-w-0 break-words text-xs text-slate-600">
                {[student.email, student.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
              </p>
              <div className="flex flex-wrap gap-2">
                <StudentEditForm student={student} />
                {paymentsEnabled && student.active ? (
                  <StudentTariffForm
                    studentId={student.id}
                    category={student.category}
                    tariffs={tariffs ?? []}
                    current={tariff?.name}
                  />
                ) : null}
                <StudentActiveAction id={student.id} name={fullName} active={student.active} />
              </div>
            </article>
          )
        })}
        {!rows?.length ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-800">
              {q || clubId || category || level
                ? 'No hay alumnos que coincidan con estos filtros'
                : status === 'inactive'
                  ? 'No hay alumnos inactivos'
                  : 'Todavía no hay alumnos'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Prueba a quitar filtros o cambia el estado para ver más alumnos.
            </p>
          </div>
        ) : null}
      </section>
      {count > pageSize ? (
        <nav aria-label="Paginación de alumnos" className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
                href={paginationHref(page - 1)}
              >
                Anterior
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
                href={paginationHref(page + 1)}
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
