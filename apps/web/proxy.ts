import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const isLogin = request.nextUrl.pathname.startsWith('/login')
  if (isLogin) return response
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return new NextResponse('Configuración de Supabase incompleta', { status: 500 })
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => { response.cookies.set(name, value, options) }) } })
  const { data, error } = await supabase.auth.getClaims()
  const role = data?.claims?.app_metadata?.role
  if (error || !data?.claims) {
    const redirect = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }
  if (data?.claims && role !== 'admin') return new NextResponse('No autorizado', { status: 403 })
  return response
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'] }
