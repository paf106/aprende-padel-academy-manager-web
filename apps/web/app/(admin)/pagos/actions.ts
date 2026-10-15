'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { getAdminUser } from '../../lib/auth'
import { requireModule } from '../../lib/modules'
import type { ActionResult } from '../../lib/action-result'

async function getAdminContext() {
  await requireModule('payments')
  const user = await getAdminUser()
  if (!user) return null
  return { user, supabase: await getSupabaseServer() }
}

export async function generatePayments(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const period = z.iso.date().safeParse(formData.get('period'))
  if (!period.success || !period.data.endsWith('-01')) return { ok: false, message: 'Elige un mes válido.' }
  const context = await getAdminContext()
  if (!context) return { ok: false, message: 'No autorizado.' }
  const { error } = await context.supabase
    .schema('payments')
    .rpc('generate_period_payments', { p_period: period.data })
  if (error) return { ok: false, message: 'No se pudieron generar los cobros y liquidaciones del mes.' }
  revalidatePath('/pagos')
  return { ok: true, message: 'Cobros y liquidaciones generados.' }
}

export async function saveTariff(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const input = z
    .object({
      name: z.string().trim().min(2).max(100),
      category: z.enum(['adult', 'child']),
      amountEuros: z.coerce.number().finite().min(0).max(10000),
    })
    .safeParse(Object.fromEntries(formData))
  if (!input.success) return { ok: false, message: 'Indica nombre, categoría e importe mensual válidos.' }
  const context = await getAdminContext()
  if (!context) return { ok: false, message: 'No autorizado.' }
  const organizationId = context.user.app_metadata?.organization_id
  if (typeof organizationId !== 'string') return { ok: false, message: 'Organización no disponible.' }
  const { error } = await context.supabase
    .schema('payments')
    .from('tariffs')
    .insert({
      organization_id: organizationId,
      name: input.data.name,
      category: input.data.category,
      monthly_amount_cents: Math.round(input.data.amountEuros * 100),
    })
  if (error) return { ok: false, message: 'No se pudo guardar la tarifa.' }
  revalidatePath('/pagos/tarifas')
  revalidatePath('/alumnos')
  return { ok: true, message: 'Tarifa guardada.' }
}

export async function saveTeacherRates(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const input = z
    .object({
      belowEuros: z.coerce.number().finite().min(0).max(1000),
      thresholdEuros: z.coerce.number().finite().min(0).max(1000),
      studentThreshold: z.coerce.number().int().min(1).max(16),
      teacherId: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
    })
    .safeParse(Object.fromEntries(formData))
  if (!input.success) return { ok: false, message: 'Revisa los importes y el mínimo de alumnos.' }
  const context = await getAdminContext()
  if (!context) return { ok: false, message: 'No autorizado.' }
  const organizationId = context.user.app_metadata?.organization_id
  if (typeof organizationId !== 'string') return { ok: false, message: 'Organización no disponible.' }
  const rates = {
    below_threshold_cents: Math.round(input.data.belowEuros * 100),
    threshold_rate_cents: Math.round(input.data.thresholdEuros * 100),
    student_threshold: input.data.studentThreshold,
  }
  if (input.data.teacherId) {
    const { error } = await context.supabase
      .schema('payments')
      .from('teacher_rates')
      .upsert({ teacher_id: input.data.teacherId, ...rates })
    if (error) return { ok: false, message: 'No se pudo guardar la tarifa del profesor.' }
  } else {
    const { error } = await context.supabase.schema('payments').from('settings').upsert({
      organization_id: organizationId,
      teacher_rate_below_cents: rates.below_threshold_cents,
      teacher_rate_threshold_cents: rates.threshold_rate_cents,
      teacher_student_threshold: rates.student_threshold,
    })
    if (error) return { ok: false, message: 'No se pudo guardar la tarifa por defecto.' }
  }
  revalidatePath('/pagos/tarifas')
  return { ok: true, message: 'Tarifas docentes actualizadas.' }
}

const moneyInput = z
  .string()
  .regex(/^\d{1,7}(?:[.,]\d{1,2})?$/)
  .transform((value) => Math.round(Number(value.replace(',', '.')) * 100))
  .pipe(z.number().int().nonnegative())

export async function recordStudentPayment(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = z
    .object({
      chargeId: z.uuid(),
      amount: moneyInput,
      method: z.enum(['cash', 'bizum']),
      note: z.string().max(300).optional(),
    })
    .safeParse(Object.fromEntries(formData))
  if (!input.success || input.data.amount === 0)
    return { ok: false, message: 'Importe o método de pago no válido.' }
  const context = await getAdminContext()
  if (!context) return { ok: false, message: 'No autorizado.' }
  const { error } = await context.supabase
    .schema('payments')
    .from('student_transactions')
    .insert({
      charge_id: input.data.chargeId,
      amount_cents: input.data.amount,
      method: input.data.method,
      created_by: context.user.id,
      note: input.data.note || null,
    })
  if (error) return { ok: false, message: 'No se pudo registrar el pago.' }
  revalidatePath('/pagos')
  return { ok: true, message: 'Pago registrado.' }
}

export async function recordTeacherPayment(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = z
    .object({
      settlementId: z.uuid(),
      amount: moneyInput,
      method: z.enum(['cash', 'bizum']),
      note: z.string().max(300).optional(),
    })
    .safeParse(Object.fromEntries(formData))
  if (!input.success || input.data.amount === 0)
    return { ok: false, message: 'Importe o método de pago no válido.' }
  const context = await getAdminContext()
  if (!context) return { ok: false, message: 'No autorizado.' }
  const { error } = await context.supabase
    .schema('payments')
    .from('teacher_transactions')
    .insert({
      settlement_id: input.data.settlementId,
      amount_cents: input.data.amount,
      method: input.data.method,
      created_by: context.user.id,
      note: input.data.note || null,
    })
  if (error) return { ok: false, message: 'No se pudo registrar el pago al profesor.' }
  revalidatePath('/pagos')
  return { ok: true, message: 'Pago al profesor registrado.' }
}

export async function setTeacherRateOverride(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const context = await getAdminContext()
  if (!context) return { ok: false, message: 'No autorizado.' }
  const id = z.uuid().safeParse(formData.get('teacherId'))
  if (!id.success) return { ok: false, message: 'Profesor no válido.' }
  if (formData.get('clearOverride') === 'true') {
    const { error } = await context.supabase
      .schema('payments')
      .from('teacher_rates')
      .delete()
      .eq('teacher_id', id.data)
    if (error) return { ok: false, message: 'No se pudo quitar la excepción.' }
  } else {
    const parsed = z
      .object({ below: moneyInput, threshold: moneyInput })
      .safeParse({ below: formData.get('below'), threshold: formData.get('threshold') })
    if (!parsed.success) return { ok: false, message: 'Introduce las dos tarifas por hora.' }
    const { error } = await context.supabase.schema('payments').from('teacher_rates').upsert({
      teacher_id: id.data,
      below_threshold_cents: parsed.data.below,
      threshold_rate_cents: parsed.data.threshold,
    })
    if (error) return { ok: false, message: 'No se pudo guardar la tarifa docente.' }
  }
  revalidatePath('/pagos/tarifas')
  return { ok: true, message: 'Excepción docente actualizada.' }
}

export async function adjustStudentCharge(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const input = z
    .object({ chargeId: z.uuid(), override: moneyInput, reason: z.string().trim().min(3).max(300) })
    .safeParse(Object.fromEntries(formData))
  if (!input.success) return { ok: false, message: 'El ajuste necesita importe y motivo.' }
  const context = await getAdminContext()
  if (!context) return { ok: false, message: 'No autorizado.' }
  const { error } = await context.supabase
    .schema('payments')
    .from('student_charges')
    .update({
      override_amount_cents: input.data.override,
      override_reason: input.data.reason,
    })
    .eq('id', input.data.chargeId)
  if (error)
    return { ok: false, message: 'El ajuste no puede ser inferior a lo cobrado o no se pudo aplicar.' }
  revalidatePath('/pagos')
  return { ok: true, message: 'Ajuste aplicado.' }
}

export async function adjustTeacherSettlement(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = z
    .object({ settlementId: z.uuid(), override: moneyInput, reason: z.string().trim().min(3).max(300) })
    .safeParse(Object.fromEntries(formData))
  if (!input.success) return { ok: false, message: 'El ajuste necesita importe y motivo.' }
  const context = await getAdminContext()
  if (!context) return { ok: false, message: 'No autorizado.' }
  const { error } = await context.supabase
    .schema('payments')
    .from('teacher_settlements')
    .update({
      override_amount_cents: input.data.override,
      override_reason: input.data.reason,
    })
    .eq('id', input.data.settlementId)
  if (error)
    return { ok: false, message: 'El ajuste no puede ser inferior a lo pagado o no se pudo aplicar.' }
  revalidatePath('/pagos')
  return { ok: true, message: 'Ajuste aplicado.' }
}

export async function closeBillingPeriod(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const period = z.iso.date().safeParse(formData.get('period'))
  if (!period.success || !period.data.endsWith('-01')) return { ok: false, message: 'Mes no válido.' }
  const context = await getAdminContext()
  if (!context) return { ok: false, message: 'No autorizado.' }
  const { error } = await context.supabase.schema('payments').rpc('close_period', { p_period: period.data })
  if (error) return { ok: false, message: 'No se pudo cerrar el mes; quizá aún no se ha generado.' }
  revalidatePath('/pagos')
  return { ok: true, message: 'Mes cerrado. Ya no admite recálculos ni nuevos pagos.' }
}
