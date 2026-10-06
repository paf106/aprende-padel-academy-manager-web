'use client'
import * as Select from '@radix-ui/react-select'
import { useActionState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { setSessionStatus, type ActionResult } from '../actions'

const initial: ActionResult | null = null
export function SessionStatusForm({sessionId,initialStatus}:{sessionId:string;initialStatus:'pending'|'completed'|'cancelled'}) {
  const [result,action,pending]=useActionState(setSessionStatus,initial)
  return <form action={action} className="status-form"><input type="hidden" name="sessionId" value={sessionId}/><Select.Root name="status" defaultValue={initialStatus}><Select.Trigger className="select-trigger"><Select.Value/><Select.Icon><ChevronDown size={14}/></Select.Icon></Select.Trigger><Select.Portal><Select.Content className="select-content"><Select.Viewport>{(['pending','completed','cancelled'] as const).map((status)=><Select.Item className="select-item" key={status} value={status}><Select.ItemText>{status==='pending'?'Pendiente':status==='completed'?'Terminada':'Cancelada'}</Select.ItemText><Select.ItemIndicator><Check size={14}/></Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal></Select.Root><input name="reason" aria-label="Motivo de cancelación, requerido si se cancela" placeholder="Motivo si cancelas"/><button className="secondary-button" disabled={pending}>{pending?'Guardando…':'Guardar estado'}</button>{result?<span role="status" className={result.ok?'form-message success':'form-message error'}>{result.message}</span>:null}</form>
}
