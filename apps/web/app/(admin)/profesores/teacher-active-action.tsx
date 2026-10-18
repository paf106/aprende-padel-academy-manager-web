'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../../components/ui/button'
import { useToast } from '../../../components/ui/toast'
import { setTeacherActive } from './actions'

export function TeacherActiveAction({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const showToast = useToast()
  function change() {
    if (
      active &&
      !window.confirm(`¿Desactivar a ${name}? Ya no podrá acceder al panel ni recibir nuevas asignaciones.`)
    )
      return
    start(async () => {
      const result = await setTeacherActive(id, !active)
      showToast(result.message, result.ok ? 'success' : 'error')
      if (result.ok) router.refresh()
    })
  }
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'ghost' : 'secondary'}
      disabled={pending}
      onClick={change}
      className={active ? 'text-rose-800 hover:bg-rose-50' : ''}
    >
      {pending ? (active ? 'Desactivando…' : 'Reactivando…') : active ? 'Desactivar' : 'Reactivar'}
    </Button>
  )
}
