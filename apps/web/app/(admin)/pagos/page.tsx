import Link from 'next/link'
import {addMonths,format,parseISO} from 'date-fns'
import {es} from 'date-fns/locale'
import {getSupabaseServer} from '@aprende-padel/db/server'
import {money} from '@aprende-padel/core'
import {ClosePeriod,GeneratePayments} from './payment-client'
import {AdjustmentForm,StudentTransactionForm,TeacherTransactionForm} from './transaction-form'

export default async function PaymentsPage({searchParams}:{searchParams:Promise<{period?:string}>}) {
  const {period:requested}=await searchParams
  const current=/^\d{4}-(0[1-9]|1[0-2])$/.test(requested??'')?requested!:format(new Date(),'yyyy-MM')
  const start=`${current}-01`;const prev=format(addMonths(parseISO(start),-1),'yyyy-MM');const next=format(addMonths(parseISO(start),1),'yyyy-MM')
  const db=await getSupabaseServer()
  const [{data:charges,error:chargeError},{data:settlements,error:settlementError},{data:periodRecord}]=await Promise.all([
    db.schema('payments').from('student_charges').select('id,student_id,period,calculated_amount_cents,override_amount_cents,student_transactions(amount_cents)').eq('period',start).order('created_at'),
    db.schema('payments').from('teacher_settlements').select('id,teacher_id,period,calculated_amount_cents,override_amount_cents,teacher_transactions(amount_cents)').eq('period',start).order('created_at'),
    db.schema('payments').from('billing_periods').select('status').eq('period',start).maybeSingle(),
  ])
  if(chargeError||settlementError)throw new Error('No se pudieron cargar los pagos del mes')
  const chargeRows=charges??[];const settlementRows=settlements??[]
  const studentIds=[...new Set(chargeRows.map(c=>c.student_id))];const teacherIds=[...new Set(settlementRows.map(s=>s.teacher_id))]
  const [{data:students},{data:profiles}]=await Promise.all([
    studentIds.length?db.schema('core').from('students').select('id,first_name,last_name').in('id',studentIds):Promise.resolve({data:[]}),
    teacherIds.length?db.schema('core').from('profiles').select('id,full_name').in('id',teacherIds):Promise.resolve({data:[]}),
  ])
  const studentMap=new Map((students??[]).map(s=>[s.id,`${s.first_name} ${s.last_name}`]));const teacherMap=new Map((profiles??[]).map(p=>[p.id,p.full_name]))
  const studentDue=chargeRows.reduce((sum,c)=>sum+(c.override_amount_cents??c.calculated_amount_cents),0);const teacherDue=settlementRows.reduce((sum,c)=>sum+(c.override_amount_cents??c.calculated_amount_cents),0)
  return <main className="main"><header className="page-header"><div><p className="eyebrow">Facturación mensual</p><h1>Pagos</h1><p className="subtle">{format(parseISO(start),'MMMM yyyy',{locale:es})} · {periodRecord?.status==='closed'?'Cerrado':'Abierto'}</p></div><div className="class-actions"><Link className="secondary-button" href="/pagos/tarifas">Tarifas</Link>{periodRecord?.status!=='closed'?<><GeneratePayments period={current}/><ClosePeriod period={current}/></>:null}</div></header>
    <nav className="month-nav"><Link className="secondary-button" href={`/pagos?period=${prev}`}>← Mes anterior</Link><Link className="secondary-button" href="/pagos">Mes actual</Link><Link className="secondary-button" href={`/pagos?period=${next}`}>Mes siguiente →</Link></nav>
    <section className="grid"><article className="metric"><div className="metric-label">Cobros de alumnos</div><div className="metric-value">{money(studentDue)}</div><div className="metric-note">{chargeRows.length} cuentas</div></article><article className="metric"><div className="metric-label">Liquidaciones de profesores</div><div className="metric-value">{money(teacherDue)}</div><div className="metric-note">{settlementRows.length} profesores</div></article></section>
    <section className="panel payment-section"><div className="panel-head"><h2>Alumnos</h2></div>{chargeRows.length?chargeRows.map(c=>{const due=c.override_amount_cents??c.calculated_amount_cents;const paid=(c.student_transactions??[]).reduce((sum,t)=>sum+t.amount_cents,0);return <article className="payment-card" key={c.id}><div className="payment-row"><strong>{studentMap.get(c.student_id)}</strong><span>{money(paid)} / {money(due)}</span><span className={`pill ${paid>=due?'completed':paid>0?'pending':'cancelled'}`}>{paid>=due?'Pagado':paid>0?'Parcial':'Pendiente'}</span></div><div className="payment-controls"><StudentTransactionForm id={c.id} balance={Math.max(0,due-paid)}/><AdjustmentForm id={c.id} currentAmount={due}/></div></article>}) : <p className="empty-state">Aún no hay cobros. Asigna tarifas a los alumnos y genera el mes.</p>}</section>
    <section className="panel payment-section"><div className="panel-head"><h2>Profesores</h2></div>{settlementRows.length?settlementRows.map(s=>{const due=s.override_amount_cents??s.calculated_amount_cents;const paid=(s.teacher_transactions??[]).reduce((sum,t)=>sum+t.amount_cents,0);return <article className="payment-card" key={s.id}><div className="payment-row"><strong>{teacherMap.get(s.teacher_id)}</strong><span>{money(paid)} / {money(due)}</span><span className={`pill ${paid>=due?'completed':paid>0?'pending':'cancelled'}`}>{paid>=due?'Pagado':paid>0?'Parcial':'Pendiente'}</span></div><div className="payment-controls"><TeacherTransactionForm id={s.id} balance={Math.max(0,due-paid)}/><AdjustmentForm id={s.id} currentAmount={due} teacher/></div></article>}) : <p className="empty-state">Aún no hay liquidaciones de profesores para este mes.</p>}</section>
  </main>
}
