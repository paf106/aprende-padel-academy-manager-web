'use client'
import {useActionState} from 'react'
import {saveTariff} from './actions'
import {Button} from '../../../components/ui/button'
import type {ActionResult} from '../clases/actions'
export function TariffForm(){const[state,action,pending]=useActionState(saveTariff,null as ActionResult|null);return <form action={action} className="form-inline"><label>Nombre<input name="name" required placeholder="Adultos · 2 días por semana"/></label><label>Categoría<select name="category"><option value="adult">Adultos</option><option value="child">Infantil</option></select></label><label>Cuota mensual (€)<input name="amountEuros" type="number" step="0.01" min="0" required/></label><Button disabled={pending}>{pending?'Guardando…':'Añadir tarifa'}</Button>{state?<span className={state.ok?'form-message success':'form-message error'}>{state.message}</span>:null}</form>}
