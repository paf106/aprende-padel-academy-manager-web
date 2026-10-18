'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../../components/ui/button'
import { useToast } from '../../../components/ui/toast'
import { setStudentActive } from './actions'

export function StudentActiveAction({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const showToast = useToast()
  const nextActive = !active
  function changeStatus() {
    if (
      active &&
      !window.confirm(
        `¿Desactivar a ${name}? Se retirará de sus próximas clases; el historial se conservará.`,
      )
    )
      return
    start(async () => {
      const result = await setStudentActive(id, nextActive)
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
      onClick={changeStatus}
      className={active ? 'text-rose-800 hover:bg-rose-50' : ''}
    >
      {pending ? (active ? 'Desactivando…' : 'Reactivando…') : active ? 'Desactivar' : 'Reactivar'}
    </Button>
  )
}
