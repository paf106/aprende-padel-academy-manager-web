'use client'

import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/components/ds/button'
import { Drawer } from '@/components/ds/drawer'

export function FormDrawer({
  open,
  title,
  description,
  submitLabel = 'Guardar',
  onSubmit,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  submitLabel?: string
  onSubmit: () => void
  onClose: () => void
  children: ReactNode
}) {
  const formId = 'crud-form'
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-4">
        {children}
      </form>
    </Drawer>
  )
}
