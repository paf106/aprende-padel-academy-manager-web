'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const loginSchema = z.object({ email: z.email(), password: z.string().min(6) })

export async function login(_: string | null, formData: FormData) {
  const result = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!result.success) return 'Introduce un email y una contraseña válidos.'
  const supabase = await getSupabaseServer()
  const { error } = await supabase.auth.signInWithPassword(result.data)
  if (error) return 'No se ha podido iniciar sesión. Revisa tus credenciales.'
  redirect('/')
}

export async function logout() {
  const supabase = await getSupabaseServer()
  await supabase.auth.signOut()
  redirect('/login')
}
