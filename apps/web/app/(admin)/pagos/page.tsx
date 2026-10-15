import Link from 'next/link'
import { addMonths, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { localDateInTimeZone, money } from '@aprende-padel/core'
import { ClosePeriod, GeneratePayments } from './payment-client'
import { AdjustmentForm, StudentTransactionForm, TeacherTransactionForm } from './transaction-form'

const PAGE_SIZE = 50
const pageFrom = (value?: string) => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ period?: string; studentsPage?: string; teachersPage?: string }> }) {
  const { period: requested, studentsPage: rawStudentsPage, teachersPage: rawTeachersPage } = await searchParams
  const studentsPage = pageFrom(rawStudentsPage)
  const teachersPage = pageFrom(rawTeachersPage)
  const current = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested ?? '') ? requested! : localDateInTimeZone(new Date(), 'Europe/Madrid').slice(0, 7)
  const start = `${current}-01`
  const prev = format(addMonths(parseISO(start), -1), 'yyyy-MM')
  const next = format(addMonths(parseISO(start), 1), 'yyyy-MM')
  const db = await getSupabaseServer()
  const [{ data: charges, error: chargeError, count: chargeCount }, { data: settlements, error: settlementError, count: settlementCount }, { data: periodRecord }] = await Promise.all([
    db.schema('payments').from('student_charges').select('id,student_id,period,calculated_amount_cents,override_amount_cents,student_transactions(amount_cents)', { count: 'exact' }).eq('period', start).order('created_at').range((studentsPage - 1) * PAGE_SIZE, studentsPage * PAGE_SIZE - 1),
    db.schema('payments').from('teacher_settlements').select('id,teacher_id,period,calculated_amount_cents,override_amount_cents,teacher_transactions(amount_cents)', { count: 'exact' }).eq('period', start).order('created_at').range((teachersPage - 1) * PAGE_SIZE, teachersPage * PAGE_SIZE - 1),
    db.schema('payments').from('billing_periods').select('status').eq('period', start).maybeSingle(),
  ])
  if (chargeError || settlementError) throw new Error('No se pudieron cargar los pagos del mes')
  const chargeRows = charges ?? []; const settlementRows = settlements ?? []
  const studentIds = [...new Set(chargeRows.map((charge) => charge.student_id))]; const teacherIds = [...new Set(settlementRows.map((settlement) => settlement.teacher_id))]
  const [{ data: students }, { data: profiles }] = await Promise.all([
    studentIds.length ? db.schema('core').from('students').select('id,first_name,last_name').in('id', studentIds) : Promise.resolve({ data: [] }),
    teacherIds.length ? db.schema('core').from('profiles').select('id,full_name').in('id', teacherIds) : Promise.resolve({ data: [] }),
  ])
  const studentMap = new Map((students ?? []).map((student) => [student.id, `${student.first_name} ${student.last_name}`]))
  const teacherMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
  const studentDue = chargeRows.reduce((sum, charge) => sum + (charge.override_amount_cents ?? charge.calculated_amount_cents), 0)
  const teacherDue = settlementRows.reduce((sum, settlement) => sum + (settlement.override_amount_cents ?? settlement.calculated_amount_cents), 0)
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
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-8">
    <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-medium text-emerald-800">Facturación mensual</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Pagos</h1><p className="mt-2 text-sm capitalize text-slate-500">{format(parseISO(start), 'MMMM yyyy', { locale: es })} · {closed ? 'Cerrado' : 'Abierto'}</p></div><div className="flex flex-wrap items-center gap-2"><Link className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/pagos/tarifas">Tarifas</Link>{!closed ? <><GeneratePayments period={current}/><ClosePeriod period={current}/></> : null}</div></header>
    <nav className="mb-5 flex gap-2"><Link className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href={`/pagos?period=${prev}`}>← Mes anterior</Link><Link className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/pagos">Mes actual</Link><Link className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href={`/pagos?period=${next}`}>Mes siguiente →</Link></nav>
     <section className="mb-5 grid gap-4 sm:grid-cols-2"><article className="rounded-2xl border border-slate-300 bg-white p-5"><span className="text-sm text-slate-600">Cobros de alumnos (importe visible)</span><p className="mb-0 mt-3 text-3xl font-semibold tabular-nums">{money(studentDue)}</p><p className="mb-0 mt-1 text-xs text-slate-600">{new Intl.NumberFormat('es-ES').format(chargeCount ?? 0)} {chargeCount === 1 ? 'cuenta' : 'cuentas'} en total</p></article><article className="rounded-2xl border border-slate-300 bg-white p-5"><span className="text-sm text-slate-600">Liquidaciones (importe visible)</span><p className="mb-0 mt-3 text-3xl font-semibold tabular-nums">{money(teacherDue)}</p><p className="mb-0 mt-1 text-xs text-slate-600">{new Intl.NumberFormat('es-ES').format(settlementCount ?? 0)} {settlementCount === 1 ? 'profesor' : 'profesores'} en total</p></article></section>
     <section className="mb-5 overflow-hidden rounded-2xl border border-slate-300 bg-white"><header className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Alumnos</h2></header>{chargeRows.length ? chargeRows.map((charge) => { const due = charge.override_amount_cents ?? charge.calculated_amount_cents; const paid = (charge.student_transactions ?? []).reduce((sum, transaction) => sum + transaction.amount_cents, 0); return <article className="border-b border-slate-200 p-4 last:border-0 sm:px-5" key={charge.id}><div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><strong className="min-w-0 truncate text-sm">{studentMap.get(charge.student_id) ?? 'Alumno no disponible'}</strong><span className="text-sm tabular-nums">{money(paid)} / {money(due)}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paid >= due ? 'bg-emerald-50 text-emerald-900' : 'bg-blue-50 text-blue-900'}`}>{paid >= due ? 'Pagado' : paid > 0 ? 'Parcial' : 'Pendiente'}</span></div>{!closed ? <div className="mt-3 flex flex-wrap items-end gap-4"><StudentTransactionForm id={charge.id} balance={Math.max(0, due - paid)}/><details className="group"><summary aria-label={`Ajustar importe de ${studentMap.get(charge.student_id) ?? 'alumno'}`} className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-300 text-lg text-slate-700 hover:bg-slate-100">⋯</summary><div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-3"><AdjustmentForm id={charge.id} currentAmount={due}/></div></details></div> : null}</article> }) : <p className="p-7 text-sm text-slate-600">Aún no hay cobros. Asigna tarifas a los alumnos y genera el mes.</p>}<PagePagination page={studentsPage} pageCount={Math.ceil((chargeCount ?? 0) / PAGE_SIZE)} href={(page) => paginationHref('students', page)}/></section>
     <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white"><header className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Profesores</h2></header>{settlementRows.length ? settlementRows.map((settlement) => { const due = settlement.override_amount_cents ?? settlement.calculated_amount_cents; const paid = (settlement.teacher_transactions ?? []).reduce((sum, transaction) => sum + transaction.amount_cents, 0); return <article className="border-b border-slate-200 p-4 last:border-0 sm:px-5" key={settlement.id}><div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><strong className="min-w-0 truncate text-sm">{teacherMap.get(settlement.teacher_id) ?? 'Profesor no disponible'}</strong><span className="text-sm tabular-nums">{money(paid)} / {money(due)}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paid >= due ? 'bg-emerald-50 text-emerald-900' : 'bg-blue-50 text-blue-900'}`}>{paid >= due ? 'Pagado' : paid > 0 ? 'Parcial' : 'Pendiente'}</span></div>{!closed ? <div className="mt-3 flex flex-wrap items-end gap-4"><TeacherTransactionForm id={settlement.id} balance={Math.max(0, due - paid)}/><details><summary aria-label={`Ajustar liquidación de ${teacherMap.get(settlement.teacher_id) ?? 'profesor'}`} className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-300 text-lg text-slate-700 hover:bg-slate-100">⋯</summary><div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-3"><AdjustmentForm id={settlement.id} currentAmount={due} teacher/></div></details></div> : null}</article> }) : <p className="p-7 text-sm text-slate-600">Aún no hay liquidaciones de profesores para este mes.</p>}<PagePagination page={teachersPage} pageCount={Math.ceil((settlementCount ?? 0) / PAGE_SIZE)} href={(page) => paginationHref('teachers', page)}/></section>
  </main>
}

function PagePagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null
  return <nav aria-label="Paginación de resultados" className="flex items-center justify-between border-t border-slate-200 px-4 py-3"><span className="text-sm text-slate-600">Página {page} de {pageCount}</span><div className="flex gap-2">{page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-xl border border-slate-400 px-3 text-sm font-medium text-slate-800 hover:bg-slate-100" href={href(page - 1)}>Anterior</Link> : null}{page < pageCount ? <Link className="inline-flex min-h-11 items-center rounded-xl border border-slate-400 px-3 text-sm font-medium text-slate-800 hover:bg-slate-100" href={href(page + 1)}>Siguiente</Link> : null}</div></nav>
}
