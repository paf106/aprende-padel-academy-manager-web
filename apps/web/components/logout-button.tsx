'use client'
import { useTransition } from 'react'
import { Button } from './ui/button'
import { logout } from '../app/login/actions'
export function LogoutButton() { const [pending, startTransition] = useTransition(); return <Button variant="ghost" onClick={() => startTransition(() => logout())} disabled={pending} className="mt-3 min-h-8 justify-start px-0 text-xs text-emerald-200 hover:bg-transparent hover:text-white">{pending ? 'Saliendo…' : 'Cerrar sesión'}</Button> }
