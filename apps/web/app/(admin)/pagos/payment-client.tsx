'use client'
import {useActionState} from 'react'
import {closeBillingPeriod,generatePayments} from './actions'
import {Button} from '../../../components/ui/button'
import type {ActionResult} from '../clases/actions'
export function GeneratePayments({period}:{period:string}){const[state,action,pending]=useActionState(generatePayments,null as ActionResult|null);return <form action={action} className="generate-payments"><input type="hidden" name="period" value={`${period}-01`}/><Button disabled={pending}>{pending?'Generando…':'Generar cobros del mes'}</Button>{state?<span className={state.ok?'form-message success':'form-message error'} role="status">{state.message}</span>:null}</form>}
export function ClosePeriod({period}:{period:string}){const[state,action,pending]=useActionState(closeBillingPeriod,null as ActionResult|null);return <form action={action} className="generate-payments"><input type="hidden" name="period" value={`${period}-01`}/><Button variant="secondary" disabled={pending}>{pending?'Cerrando…':'Cerrar el mes'}</Button>{state?<span role="status" className={state.ok?'form-message success':'form-message error'}>{state.message}</span>:null}</form>}
