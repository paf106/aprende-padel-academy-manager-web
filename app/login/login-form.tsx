'use client'

import { useActionState, useEffect, useRef } from 'react'
import { login } from '@/app/login/actions'
import { Button } from '@/components/ds/button'
import { Card } from '@/components/ds/card'
import { FormMessage } from '@/components/ds/form-message'
import { Input, Label } from '@/components/ds/input'

export function LoginForm({ unauthorized = false }: { unauthorized?: boolean }) {
  const [error, action, pending] = useActionState(login, null)
  const emailRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (error) emailRef.current?.focus()
  }, [error])

  return (
    <Card className="w-full max-w-[420px] p-7 sm:p-9">
      <form action={action} className="grid gap-4">
        <div>
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl bg-brand font-bold text-brand-foreground"
          >
            A
          </span>
          <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight">Entrar al panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestiona tu academia desde un solo lugar.</p>
        </div>
        {unauthorized ? (
          <FormMessage tone="info">
            La cuenta ha iniciado sesión, pero no tiene acceso de administrador. Contacta con el administrador
            de la academia para que active tus permisos.
          </FormMessage>
        ) : null}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            ref={emailRef}
            name="email"
            type="email"
            autoComplete="username"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
        </div>
        {error ? (
          <div id="login-error">
            <FormMessage>{error}</FormMessage>
          </div>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </Card>
  )
}
