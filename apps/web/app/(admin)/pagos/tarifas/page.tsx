import Link from 'next/link'
import { money } from '@aprende-padel/core'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { TariffForm } from '../tariffs-form'
import { DefaultTeacherRatesForm, TeacherOverrideRatesForm } from '../teacher-rates-form'

export default async function TariffsPage() {
  const db = await getSupabaseServer()
  const [{ data: tariffs, error }, { data: settings }, { data: teachers }, { data: rates }] =
    await Promise.all([
      db
        .schema('payments')
        .from('tariffs')
        .select('id,name,category,monthly_amount_cents,active')
        .order('name'),
      db
        .schema('payments')
        .from('settings')
        .select('teacher_rate_below_cents,teacher_rate_threshold_cents,teacher_student_threshold')
        .limit(1)
        .maybeSingle(),
      db.schema('core').from('profiles').select('id,full_name').eq('role', 'teacher').eq('active', true),
      db
        .schema('payments')
        .from('teacher_rates')
        .select('teacher_id,below_threshold_cents,threshold_rate_cents,student_threshold'),
    ])
  if (error) throw new Error('No se pudieron cargar las tarifas')
  const ratesByTeacher = new Map((rates ?? []).map((rate) => [rate.teacher_id, rate]))
  const defaults = settings ?? {
    teacher_rate_below_cents: 1200,
    teacher_rate_threshold_cents: 1500,
    teacher_student_threshold: 3,
  }
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-7 sm:px-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-800">Configuración mensual</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tarifas</h1>
        </div>
        <Link
          href="/pagos"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Volver a pagos
        </Link>
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold">Tarifas de alumnos</h2>
        </header>
        <TariffForm />
        {(tariffs ?? []).map((tariff) => (
          <div
            className="grid grid-cols-3 border-b border-slate-100 px-5 py-4 text-sm last:border-0"
            key={tariff.id}
          >
            <strong>{tariff.name}</strong>
            <span className="text-slate-500">{tariff.category === 'adult' ? 'Adultos' : 'Infantil'}</span>
            <strong className="text-right">{money(tariff.monthly_amount_cents)} / mes</strong>
          </div>
        ))}
        {!tariffs?.length ? (
          <p className="p-6 text-sm text-slate-500">Todavía no hay tarifas configuradas.</p>
        ) : null}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold">Tarifas docentes</h2>
          <p className="mt-1 text-xs text-slate-600">Tarifa por hora según el número de alumnos inscritos.</p>
        </header>
        <div className="border-b border-slate-100">
          <p className="px-5 pt-4 text-sm font-medium">Valor general</p>
          <DefaultTeacherRatesForm settings={defaults} />
        </div>
        <div className="border-b border-slate-100 px-5 py-4 text-sm font-semibold">
          Excepciones por profesor
        </div>
        {(teachers ?? []).map((teacher) => {
          const rate = ratesByTeacher.get(teacher.id)
          return (
            <div className="border-b border-slate-100 last:border-0" key={teacher.id}>
              <strong className="block px-5 pt-4 text-sm">{teacher.full_name}</strong>
              <TeacherOverrideRatesForm
                teacherId={teacher.id}
                settings={{
                  teacher_rate_below_cents: rate?.below_threshold_cents ?? defaults.teacher_rate_below_cents,
                  teacher_rate_threshold_cents:
                    rate?.threshold_rate_cents ?? defaults.teacher_rate_threshold_cents,
                  teacher_student_threshold: rate?.student_threshold ?? defaults.teacher_student_threshold,
                }}
              />
            </div>
          )
        })}
      </section>
    </main>
  )
}
