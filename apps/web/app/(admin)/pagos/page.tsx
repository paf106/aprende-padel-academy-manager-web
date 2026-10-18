import Link from 'next/link'
import { addMonths, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { localDateInTimeZone, money, paymentBalance } from '@aprende-padel/core'
import { Button } from '../../../components/ui/button'
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

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; studentsPage?: string; teachersPage?: string }>
}) {
  const {
    period: requested,
    studentsPage: rawStudentsPage,
    teachersPage: rawTeachersPage,
  } = await searchParams
  const studentsPage = pageFrom(rawStudentsPage)
  const teachersPage = pageFrom(rawTeachersPage)
  const current = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested ?? '')
    ? requested!
    : localDateInTimeZone(new Date(), 'Europe/Madrid').slice(0, 7)
  const currentMonth = localDateInTimeZone(new Date(), 'Europe/Madrid').slice(0, 7)
  const start = `${current}-01`
  const prev = format(addMonths(parseISO(start), -1), 'yyyy-MM')
  const next = format(addMonths(parseISO(start), 1), 'yyyy-MM')
  const db = await getSupabaseServer()
  const [
    { data: charges, error: chargeError, count: chargeCount },
    { data: settlements, error: settlementError, count: settlementCount },
    { data: periodRecord },
  ] = await Promise.all([
    db
      .schema('payments')
      .from('student_charges')
      .select(
        'id,student_id,period,calculated_amount_cents,override_amount_cents,student_transactions(amount_cents)',
        { count: 'exact' },
      )
      .eq('period', start)
      .order('created_at')
      .range((studentsPage - 1) * PAGE_SIZE, studentsPage * PAGE_SIZE - 1),
    db
      .schema('payments')
      .from('teacher_settlements')
      .select(
        'id,teacher_id,period,calculated_amount_cents,override_amount_cents,teacher_transactions(amount_cents)',
        { count: 'exact' },
      )
      .eq('period', start)
      .order('created_at')
      .range((teachersPage - 1) * PAGE_SIZE, teachersPage * PAGE_SIZE - 1),
    db.schema('payments').from('billing_periods').select('status').eq('period', start).maybeSingle(),
  ])
  if (chargeError || settlementError) throw new Error('No se pudieron cargar los pagos del mes')
  const chargeRows = charges ?? []
  const settlementRows = settlements ?? []
  const studentIds = [...new Set(chargeRows.map((charge) => charge.student_id))]
  const teacherIds = [...new Set(settlementRows.map((settlement) => settlement.teacher_id))]
  const [{ data: students }, { data: profiles }] = await Promise.all([
    studentIds.length
      ? db.schema('core').from('students').select('id,first_name,last_name').in('id', studentIds)
      : Promise.resolve({ data: [] }),
    teacherIds.length
      ? db.schema('core').from('profiles').select('id,full_name').in('id', teacherIds)
      : Promise.resolve({ data: [] }),
  ])
  const studentMap = new Map(
    (students ?? []).map((student) => [student.id, `${student.first_name} ${student.last_name}`]),
  )
  const teacherMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
  const studentDue = chargeRows.reduce(
    (sum, charge) => sum + (charge.override_amount_cents ?? charge.calculated_amount_cents),
    0,
  )
  const teacherDue = settlementRows.reduce(
    (sum, settlement) => sum + (settlement.override_amount_cents ?? settlement.calculated_amount_cents),
    0,
  )
  const closed = periodRecord?.status === 'closed'
  const paginationHref = (kind: 'students' | 'teachers', page: number) => {
    const params = new URLSearchParams({ period: current })
    if (kind === 'students') {
      if (page > 1) params.set('studentsPage', String(page))
      if (teachersPage > 1) params.set('teachersPage', String(teachersPage))
    } else {
      if (studentsPage > 1) params.set('studentsPage', String(studentsPage))
      if (page > 1) params.set('teachersPage', String(page))
    }
    return `/pagos?${params.toString()}`
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <PageHeader
        title="Pagos"
        description={
          <span className="capitalize">
            {format(parseISO(start), 'MMMM yyyy', { locale: es })} · {closed ? 'Cerrado' : 'Abierto'}
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
            className="inline-flex min-h-11 items-center rounded-full border border-slate-400 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-100"
            href={`/pagos?period=${prev}`}
          >
            <span aria-hidden="true">← </span>Mes anterior
          </Link>
          <Link
            aria-current={current === currentMonth ? 'page' : undefined}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-400 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-100"
            href="/pagos"
          >
            Mes actual
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-slate-400 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-100"
            href={`/pagos?period=${next}`}
          >
            Mes siguiente<span aria-hidden="true"> →</span>
          </Link>
        </nav>
        <form action="/pagos" method="get" className="flex items-end gap-2">
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Ir a un mes
            <input
              type="month"
              name="period"
              defaultValue={current}
              className="min-h-11 rounded-xl border border-slate-500 bg-white px-3 text-sm"
            />
          </label>
          <Button type="submit" size="sm">
            Ver mes
          </Button>
        </form>
      </div>
      <section aria-label="Resumen de importes visibles" className="mb-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-sm text-slate-700">Cobros de alumnos · esta página</span>
          <p className="mb-0 mt-3 text-3xl font-semibold tabular-nums">{money(studentDue)}</p>
          <p className="mb-0 mt-1 text-xs text-slate-600">
            {countLabel(chargeCount ?? 0, 'cuenta', 'cuentas')} en total
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-sm text-slate-700">Liquidaciones · esta página</span>
          <p className="mb-0 mt-3 text-3xl font-semibold tabular-nums">{money(teacherDue)}</p>
          <p className="mb-0 mt-1 text-xs text-slate-600">
            {countLabel(settlementCount ?? 0, 'profesor', 'profesores')} en total
          </p>
        </article>
      </section>
      <PaymentsTable
        title="Alumnos"
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
              const balance = paymentBalance(
                due,
                (charge.student_transactions ?? []).map((transaction) => transaction.amount_cents),
              )
              const studentName = studentMap.get(charge.student_id) ?? 'Alumno no disponible'
              return (
                <tr className="border-b border-slate-200 last:border-0" key={charge.id}>
                  <th scope="row" className="max-w-64 truncate px-4 py-4 text-sm font-semibold">
                    {studentName}
                  </th>
                  <td className="px-4 py-4 text-sm tabular-nums">
                    {money(balance.paidCents)} / {money(due)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-medium ${balance.status === 'paid' ? 'bg-emerald-50 text-emerald-900' : balance.status === 'partial' ? 'bg-amber-50 text-amber-950' : 'bg-blue-50 text-blue-900'}`}
                    >
                      {balance.status === 'paid'
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
                          <span className="text-xs text-slate-600">Saldo liquidado</span>
                        )}
                        <details>
                          <summary
                            aria-label={`Ajustar importe de ${studentName}`}
                            className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-400 text-lg text-slate-800 hover:bg-slate-100"
                          >
                            ⋯
                          </summary>
                          <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-3">
                            <StudentAdjustmentForm id={charge.id} currentAmount={due} />
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
              const balance = paymentBalance(
                due,
                (settlement.teacher_transactions ?? []).map((transaction) => transaction.amount_cents),
              )
              const teacherName = teacherMap.get(settlement.teacher_id) ?? 'Profesor no disponible'
              return (
                <tr className="border-b border-slate-200 last:border-0" key={settlement.id}>
                  <th scope="row" className="max-w-64 truncate px-4 py-4 text-sm font-semibold">
                    {teacherName}
                  </th>
                  <td className="px-4 py-4 text-sm tabular-nums">
                    {money(balance.paidCents)} / {money(due)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-medium ${balance.status === 'paid' ? 'bg-emerald-50 text-emerald-900' : balance.status === 'partial' ? 'bg-amber-50 text-amber-950' : 'bg-blue-50 text-blue-900'}`}
                    >
                      {balance.status === 'paid'
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
                          <span className="text-xs text-slate-600">Saldo liquidado</span>
                        )}
                        <details>
                          <summary
                            aria-label={`Ajustar liquidación de ${teacherName}`}
                            className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-400 text-lg text-slate-800 hover:bg-slate-100"
                          >
                            ⋯
                          </summary>
                          <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-3">
                            <TeacherAdjustmentForm id={settlement.id} currentAmount={due} />
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
  caption,
  empty,
  count,
  page,
  pageHref,
  children,
}: {
  title: string
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
      <header className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
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
