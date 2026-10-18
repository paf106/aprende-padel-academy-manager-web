import Link from 'next/link'
import { addMonths, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { MoreHorizontal } from 'lucide-react'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { localDateInTimeZone, money, paymentBalance } from '@aprende-padel/core'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { PageHeader } from '../../../components/ui/page-header'
import { ClosePeriod, GeneratePayments } from './payment-client'
import {
  StudentAdjustmentForm,
  StudentTransactionForm,
  TeacherAdjustmentForm,
  TeacherTransactionForm,
} from './transaction-form'

const PAGE_SIZE = 50
const pageFrom = (value?: string) => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100_000) : 1
}
const countLabel = (count: number, singular: string, plural: string) =>
  `${new Intl.NumberFormat('es-ES').format(count)} ${count === 1 ? singular : plural}`
const statuses = ['all', 'pending', 'partial', 'paid', 'none'] as const
type PaymentStatus = (typeof statuses)[number]
const validStatus = (value?: string): PaymentStatus =>
  statuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : 'all'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string
    studentsPage?: string
    teachersPage?: string
    studentsStatus?: string
    teachersStatus?: string
    studentQ?: string
    teacherQ?: string
  }>
}) {
  const {
    period: requested,
    studentsPage: rawStudentsPage,
    teachersPage: rawTeachersPage,
    studentsStatus: rawStudentsStatus,
    teachersStatus: rawTeachersStatus,
    studentQ: rawStudentQ,
    teacherQ: rawTeacherQ,
  } = await searchParams
  let studentsPage = pageFrom(rawStudentsPage)
  let teachersPage = pageFrom(rawTeachersPage)
  const studentsStatus = validStatus(rawStudentsStatus)
  const teachersStatus = validStatus(rawTeachersStatus)
  const studentQ = (rawStudentQ ?? '').trim().slice(0, 100)
  const teacherQ = (rawTeacherQ ?? '').trim().slice(0, 100)
  const current = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested ?? '')
    ? requested!
    : localDateInTimeZone(new Date(), 'Europe/Madrid').slice(0, 7)
  const currentMonth = localDateInTimeZone(new Date(), 'Europe/Madrid').slice(0, 7)
  const start = `${current}-01`
  const prev = format(addMonths(parseISO(start), -1), 'yyyy-MM')
  const next = format(addMonths(parseISO(start), 1), 'yyyy-MM')
  const db = await getSupabaseServer()
  const [studentResult, teacherResult, totalsResult, { data: periodRecord }] = await Promise.all([
    db
      .schema('payments')
      .rpc('period_payment_rows', {
        p_period: start,
        p_kind: 'student',
        p_status: studentsStatus,
        p_search: studentQ || null,
        p_limit: PAGE_SIZE,
        p_offset: (studentsPage - 1) * PAGE_SIZE,
      }),
    db
      .schema('payments')
      .rpc('period_payment_rows', {
        p_period: start,
        p_kind: 'teacher',
        p_status: teachersStatus,
        p_search: teacherQ || null,
        p_limit: PAGE_SIZE,
        p_offset: (teachersPage - 1) * PAGE_SIZE,
      }),
    db.schema('payments').rpc('period_totals', { p_period: start }),
    db.schema('payments').from('billing_periods').select('status').eq('period', start).maybeSingle(),
  ])
  if (studentResult.error || teacherResult.error || totalsResult.error)
    throw new Error('No se pudieron cargar los pagos del mes')
  let chargeRows = studentResult.data ?? []
  let settlementRows = teacherResult.data ?? []
  let chargeCount = Number(chargeRows[0]?.total_count ?? 0)
  let settlementCount = Number(settlementRows[0]?.total_count ?? 0)
  if (!chargeRows.length && studentsPage > 1) {
    studentsPage = 1
    const firstPage = await db
      .schema('payments')
      .rpc('period_payment_rows', {
        p_period: start,
        p_kind: 'student',
        p_status: studentsStatus,
        p_search: studentQ || null,
        p_limit: PAGE_SIZE,
        p_offset: 0,
      })
    if (firstPage.error) throw new Error('No se pudieron cargar los cobros de alumnos')
    chargeRows = firstPage.data ?? []
    chargeCount = Number(chargeRows[0]?.total_count ?? 0)
  }
  if (!settlementRows.length && teachersPage > 1) {
    teachersPage = 1
    const firstPage = await db
      .schema('payments')
      .rpc('period_payment_rows', {
        p_period: start,
        p_kind: 'teacher',
        p_status: teachersStatus,
        p_search: teacherQ || null,
        p_limit: PAGE_SIZE,
        p_offset: 0,
      })
    if (firstPage.error) throw new Error('No se pudieron cargar las liquidaciones de profesores')
    settlementRows = firstPage.data ?? []
    settlementCount = Number(settlementRows[0]?.total_count ?? 0)
  }
  const totals = totalsResult.data?.[0] ?? {
    student_due_cents: 0,
    student_paid_cents: 0,
    student_count: 0,
    teacher_due_cents: 0,
    teacher_paid_cents: 0,
    teacher_count: 0,
  }
  const closed = periodRecord?.status === 'closed'
  const paginationHref = (kind: 'students' | 'teachers', page: number) => {
    const params = new URLSearchParams({ period: current })
    if (studentQ) params.set('studentQ', studentQ)
    if (teacherQ) params.set('teacherQ', teacherQ)
    if (studentsStatus !== 'all') params.set('studentsStatus', studentsStatus)
    if (teachersStatus !== 'all') params.set('teachersStatus', teachersStatus)
    if (kind === 'students') {
      if (page > 1) params.set('studentsPage', String(page))
      if (teachersPage > 1) params.set('teachersPage', String(teachersPage))
    } else {
      if (studentsPage > 1) params.set('studentsPage', String(studentsPage))
      if (page > 1) params.set('teachersPage', String(page))
    }
    return `/pagos?${params.toString()}`
  }
  const studentFilters = (
    <form
      action="/pagos"
      method="get"
      aria-label="Filtrar cobros de alumnos"
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="period" value={current} />
      {teachersPage > 1 ? <input type="hidden" name="teachersPage" value={teachersPage} /> : null}
      {teacherQ ? <input type="hidden" name="teacherQ" value={teacherQ} /> : null}
      {teachersStatus !== 'all' ? <input type="hidden" name="teachersStatus" value={teachersStatus} /> : null}
      <Input
        type="search"
        name="studentQ"
        defaultValue={studentQ}
        placeholder="Buscar alumno…"
        aria-label="Buscar cobro por alumno"
        autoComplete="off"
        spellCheck={false}
        className="min-h-10 w-40"
      />
      <Select
        name="studentsStatus"
        defaultValue={studentsStatus}
        aria-label="Estado de los cobros"
        className="min-h-10 w-36"
      >
        <option value="all">Todos los estados</option>
        <option value="pending">Pendiente</option>
        <option value="partial">Parcial</option>
        <option value="paid">Pagado</option>
        <option value="none">Sin importe</option>
      </Select>
      <Button type="submit" size="sm" variant="secondary">
        Filtrar
      </Button>
    </form>
  )
  const teacherFilters = (
    <form
      action="/pagos"
      method="get"
      aria-label="Filtrar liquidaciones de profesores"
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="period" value={current} />
      {studentsPage > 1 ? <input type="hidden" name="studentsPage" value={studentsPage} /> : null}
      {studentQ ? <input type="hidden" name="studentQ" value={studentQ} /> : null}
      {studentsStatus !== 'all' ? <input type="hidden" name="studentsStatus" value={studentsStatus} /> : null}
      <Input
        type="search"
        name="teacherQ"
        defaultValue={teacherQ}
        placeholder="Buscar profesor…"
        aria-label="Buscar liquidación por profesor"
        autoComplete="off"
        spellCheck={false}
        className="min-h-10 w-40"
      />
      <Select
        name="teachersStatus"
        defaultValue={teachersStatus}
        aria-label="Estado de las liquidaciones"
        className="min-h-10 w-36"
      >
        <option value="all">Todos los estados</option>
        <option value="pending">Pendiente</option>
        <option value="partial">Parcial</option>
        <option value="paid">Pagado</option>
        <option value="none">Sin importe</option>
      </Select>
      <Button type="submit" size="sm" variant="secondary">
        Filtrar
      </Button>
    </form>
  )

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <PageHeader
        title="Pagos"
        description={
          <span className="flex flex-wrap items-center gap-2 capitalize">
            {format(parseISO(start), 'MMMM yyyy', { locale: es })}
            <span
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium normal-case ${closed ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-900'}`}
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-current" />
              {closed ? 'Cerrado' : 'Abierto'}
            </span>
          </span>
        }
        actions={
          <>
            <Link
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href="/pagos/tarifas"
            >
              Tarifas
            </Link>
            {!closed ? (
              <>
                <GeneratePayments period={current} />
                <ClosePeriod period={current} />
              </>
            ) : null}
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <nav aria-label="Navegación entre meses" className="flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            href={`/pagos?period=${prev}`}
          >
            <span aria-hidden="true">← </span>Mes anterior
          </Link>
          <Link
            aria-current={current === currentMonth ? 'page' : undefined}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            href="/pagos"
          >
            Mes actual
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            href={`/pagos?period=${next}`}
          >
            Mes siguiente<span aria-hidden="true"> →</span>
          </Link>
        </nav>
        <form action="/pagos" method="get" className="flex items-end gap-2">
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Ir a un mes
            <Input type="month" name="period" defaultValue={current} />
          </label>
          <Button type="submit" size="sm">
            Ver mes
          </Button>
        </form>
      </div>
      <section aria-label="Totales de todo el mes" className="mb-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-sm text-slate-700">
            Cobros de alumnos · {countLabel(totals.student_count, 'cuenta', 'cuentas')}
          </span>
          <p className="mb-0 mt-3 text-2xl font-semibold tabular-nums">{money(totals.student_due_cents)}</p>
          <p className="mb-0 mt-1 text-sm text-slate-600">
            Cobrado {money(totals.student_paid_cents)} · Pendiente{' '}
            {money(Math.max(0, totals.student_due_cents - totals.student_paid_cents))}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-sm text-slate-700">
            Liquidaciones · {countLabel(totals.teacher_count, 'profesor', 'profesores')}
          </span>
          <p className="mb-0 mt-3 text-2xl font-semibold tabular-nums">{money(totals.teacher_due_cents)}</p>
          <p className="mb-0 mt-1 text-sm text-slate-600">
            Pagado {money(totals.teacher_paid_cents)} · Pendiente{' '}
            {money(Math.max(0, totals.teacher_due_cents - totals.teacher_paid_cents))}
          </p>
        </article>
      </section>
      <PaymentsTable
        title="Alumnos"
        filters={studentFilters}
        caption="Cobros de alumnos"
        empty="Aún no hay cobros. Asigna tarifas a los alumnos y genera el mes."
        count={chargeCount ?? 0}
        page={studentsPage}
        pageHref={(page) => paginationHref('students', page)}
      >
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">Cobros del alumnado</caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-700">
              <th scope="col" className="px-4 py-3">
                Alumno
              </th>
              <th scope="col" className="px-4 py-3">
                Pagado / total
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
              <th scope="col" className="px-4 py-3">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {chargeRows.map((charge) => {
              const due = charge.override_amount_cents ?? charge.calculated_amount_cents
              const balance = paymentBalance(due, [charge.paid_amount_cents])
              const studentName = charge.subject_name
              return (
                <tr className="border-b border-slate-200 last:border-0" key={charge.id}>
                  <th
                    scope="row"
                    title={studentName}
                    className="min-w-48 max-w-64 truncate px-4 py-4 text-sm font-semibold"
                  >
                    {studentName}
                  </th>
                  <td className="px-4 py-4 text-sm tabular-nums">
                    {money(balance.paidCents)} / {money(due)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-medium ${balance.status === 'none' ? 'bg-slate-100 text-slate-700' : balance.status === 'paid' ? 'bg-emerald-50 text-emerald-900' : balance.status === 'partial' ? 'bg-amber-50 text-amber-950' : 'bg-blue-50 text-blue-900'}`}
                    >
                      {balance.status === 'none'
                        ? 'Sin importe'
                        : balance.status === 'paid'
                          ? 'Pagado'
                          : balance.status === 'partial'
                            ? 'Parcial'
                            : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!closed ? (
                      <div className="flex flex-wrap items-center gap-3">
                        {balance.balanceCents > 0 ? (
                          <StudentTransactionForm id={charge.id} balance={balance.balanceCents} />
                        ) : (
                          <span className="text-xs text-slate-600">
                            {balance.status === 'none' ? 'Sin importe' : 'Saldo liquidado'}
                          </span>
                        )}
                        <details>
                          <summary
                            aria-label={`Ajustar importe de ${studentName}`}
                            className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-400 text-lg text-slate-800 hover:bg-slate-100"
                          >
                            <MoreHorizontal size={18} aria-hidden="true" />
                          </summary>
                          <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-3">
                            <StudentAdjustmentForm
                              id={charge.id}
                              currentAmount={due}
                              hasOverride={charge.override_amount_cents !== null}
                            />
                          </div>
                        </details>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">Periodo cerrado</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PaymentsTable>
      <PaymentsTable
        title="Profesores"
        filters={teacherFilters}
        caption="Liquidaciones de profesores"
        empty="Aún no hay liquidaciones de profesores para este mes."
        count={settlementCount ?? 0}
        page={teachersPage}
        pageHref={(page) => paginationHref('teachers', page)}
      >
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">Liquidaciones de profesores</caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-700">
              <th scope="col" className="px-4 py-3">
                Profesor
              </th>
              <th scope="col" className="px-4 py-3">
                Pagado / total
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
              <th scope="col" className="px-4 py-3">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {settlementRows.map((settlement) => {
              const due = settlement.override_amount_cents ?? settlement.calculated_amount_cents
              const balance = paymentBalance(due, [settlement.paid_amount_cents])
              const teacherName = settlement.subject_name
              return (
                <tr className="border-b border-slate-200 last:border-0" key={settlement.id}>
                  <th
                    scope="row"
                    title={teacherName}
                    className="min-w-48 max-w-64 truncate px-4 py-4 text-sm font-semibold"
                  >
                    {teacherName}
                  </th>
                  <td className="px-4 py-4 text-sm tabular-nums">
                    {money(balance.paidCents)} / {money(due)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-medium ${balance.status === 'none' ? 'bg-slate-100 text-slate-700' : balance.status === 'paid' ? 'bg-emerald-50 text-emerald-900' : balance.status === 'partial' ? 'bg-amber-50 text-amber-950' : 'bg-blue-50 text-blue-900'}`}
                    >
                      {balance.status === 'none'
                        ? 'Sin importe'
                        : balance.status === 'paid'
                          ? 'Pagado'
                          : balance.status === 'partial'
                            ? 'Parcial'
                            : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!closed ? (
                      <div className="flex flex-wrap items-center gap-3">
                        {balance.balanceCents > 0 ? (
                          <TeacherTransactionForm id={settlement.id} balance={balance.balanceCents} />
                        ) : (
                          <span className="text-xs text-slate-600">
                            {balance.status === 'none' ? 'Sin importe' : 'Saldo liquidado'}
                          </span>
                        )}
                        <details>
                          <summary
                            aria-label={`Ajustar liquidación de ${teacherName}`}
                            className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-400 text-lg text-slate-800 hover:bg-slate-100"
                          >
                            <MoreHorizontal size={18} aria-hidden="true" />
                          </summary>
                          <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-3">
                            <TeacherAdjustmentForm
                              id={settlement.id}
                              currentAmount={due}
                              hasOverride={settlement.override_amount_cents !== null}
                            />
                          </div>
                        </details>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">Periodo cerrado</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PaymentsTable>
    </main>
  )
}

function PaymentsTable({
  title,
  filters,
  caption,
  empty,
  count,
  page,
  pageHref,
  children,
}: {
  title: string
  filters?: React.ReactNode
  caption: string
  empty: string
  count: number
  page: number
  pageHref: (page: number) => string
  children: React.ReactNode
}) {
  const pageCount = Math.ceil(count / PAGE_SIZE)
  return (
    <section
      aria-label={caption}
      className="mb-5 overflow-hidden rounded-2xl border border-slate-300 bg-white"
    >
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center">
        <h2 className="shrink-0 font-semibold">{title}</h2>
        {filters}
      </header>
      {count > 0 ? (
        <div className="overflow-x-auto">{children}</div>
      ) : (
        <p className="p-7 text-sm text-slate-600">{empty}</p>
      )}
      {pageCount > 1 ? (
        <nav
          aria-label={`Paginación: ${caption}`}
          className="flex items-center justify-between border-t border-slate-200 px-4 py-3"
        >
          <span className="text-sm text-slate-600">
            Página {page} de {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-400 px-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
                href={pageHref(page - 1)}
              >
                Anterior
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-400 px-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
                href={pageHref(page + 1)}
              >
                Siguiente
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </section>
  )
}
