'use client'
import { LogOut } from 'lucide-react'
import { useTransition } from 'react'
import { logout } from '../app/login/actions'

export function LogoutButton() {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => startTransition(() => logout())}
      disabled={pending}
      className="flex h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <LogOut size={18} aria-hidden="true" />
      {pending ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  )
}
