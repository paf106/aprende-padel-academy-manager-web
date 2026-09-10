'use client'

import { useActionState } from 'react'
import { login } from './actions'

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null)
  return <form action={action} style={{ width: '100%', maxWidth: 400, background: 'white', padding: 32, borderRadius: 18, border: '1px solid #dfe5df' }}>
    <div className="eyebrow">AprendePadel Academy</div><h1 style={{ fontSize: 36 }}>Entrar al panel</h1>
    <p className="subtle" style={{ marginBottom: 24 }}>Gestiona tus clubes desde un solo lugar.</p>
    <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Email<input name="email" type="email" autoComplete="email" required style={{ padding: 12, border: '1px solid #dfe5df', borderRadius: 9 }} /></label>
    <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 700, marginBottom: 20 }}>Contraseña<input name="password" type="password" autoComplete="current-password" required style={{ padding: 12, border: '1px solid #dfe5df', borderRadius: 9 }} /></label>
    {error ? <p role="alert" style={{ color: '#ad5529', fontSize: 13, margin: '0 0 14px' }}>{error}</p> : null}
    <button disabled={pending} type="submit" style={{ width: '100%', background: '#16795a', color: 'white', border: 0, borderRadius: 9, padding: 13, fontWeight: 700, opacity: pending ? .7 : 1 }}>{pending ? 'Entrando...' : 'Entrar'}</button>
  </form>
}
