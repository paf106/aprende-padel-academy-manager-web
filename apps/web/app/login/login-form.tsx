'use client'

import { useActionState } from 'react'
import { login } from './actions'
import { FormMessage } from '../../components/ui/form-message'

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null)
  return <form action={action} className="w-full max-w-[420px] rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
    <p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-800">AprendePadel Academy</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Entrar al panel</h1>
    <p className="mb-7 mt-2 text-sm text-slate-500">Gestiona tus clubes desde un solo lugar.</p>
    <label className="mb-4 grid gap-2 text-sm font-medium text-slate-700">Email<input name="email" type="email" autoComplete="email" required className="min-h-11 rounded-xl border border-slate-300 px-3"/></label>
    <label className="mb-5 grid gap-2 text-sm font-medium text-slate-700">Contraseña<input name="password" type="password" autoComplete="current-password" required className="min-h-11 rounded-xl border border-slate-300 px-3"/></label>
    {error ? <FormMessage>{error}</FormMessage> : null}
    <button disabled={pending} type="submit" className="mt-2 min-h-11 w-full rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{pending ? 'Entrando…' : 'Entrar'}</button>
  </form>
}
