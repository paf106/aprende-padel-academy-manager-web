import Link from 'next/link'
import { money } from '@aprende-padel/core'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { PageHeader } from '../../../../components/ui/page-header'
import { TariffForm } from '../tariffs-form'
import { TariffActiveAction, TariffEditForm } from '../tariff-actions'
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
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-7 sm:px-8">
      <PageHeader
        title="Tarifas"
        description="Configura las cuotas mensuales y las tarifas por hora del equipo docente."
        actions={
          <Link
            href="/pagos"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Volver a pagos
          </Link>
        }
      />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold">Tarifas de alumnos</h2>
        </header>
        <TariffForm />
        {tariffs?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Tarifas de alumnos</caption>
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-600">
                  <th scope="col" className="px-5 py-3">
                    Nombre
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Categoría
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Estado
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Cuota
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {tariffs.map((tariff) => (
                  <tr className="border-b border-slate-100 last:border-0" key={tariff.id}>
                    <th scope="row" className="max-w-sm break-words px-5 py-4 font-medium">
                      {tariff.name}
                    </th>
                    <td className="px-5 py-4 text-slate-600">
                      {tariff.category === 'adult' ? 'Adultos' : 'Infantil'}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-medium ${tariff.active ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-700'}`}
                      >
                        {tariff.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium tabular-nums">
                      {money(tariff.monthly_amount_cents)} / mes
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <TariffEditForm tariff={tariff} />
                        <TariffActiveAction tariff={tariff} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-800">Todavía no hay tarifas configuradas</p>
            <p className="mt-1 text-sm text-slate-600">Añade una cuota mensual para poder generar cobros.</p>
          </div>
        )}
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
        <h3 className="border-b border-slate-100 px-5 py-4 text-sm font-semibold">
          Excepciones por profesor
        </h3>
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
                hasOverride={Boolean(rate)}
              />
            </div>
          )
        })}
        {!teachers?.length ? (
          <p className="p-6 text-sm text-slate-600">
            No hay profesores activos a los que asignar una excepción.
          </p>
        ) : null}
      </section>
    </main>
  )
}
