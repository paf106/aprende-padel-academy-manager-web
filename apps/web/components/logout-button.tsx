'use client'
import { useTransition } from 'react'
import { logout } from '../app/login/actions'
export function LogoutButton() { const [pending, startTransition] = useTransition(); return <button onClick={() => startTransition(() => logout())} disabled={pending} className="logout-button">{pending ? 'Saliendo...' : 'Cerrar sesión'}</button> }
