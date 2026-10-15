import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const isLogin = request.nextUrl.pathname.startsWith('/login')
  const isProtected = request.nextUrl.pathname === '/' || /^\/(clases|grupos|alumnos|profesores|clubes|pagos)(\/|$)/.test(request.nextUrl.pathname)
  if (!isLogin && !isProtected) return response
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return new NextResponse('Configuración de Supabase incompleta', { status: 500 })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data, error } = await supabase.auth.getClaims()
  const role = data?.claims?.app_metadata?.role
  if (isLogin && data?.claims && !error) return NextResponse.redirect(new URL('/', request.url))
  if (!isLogin && (error || !data?.claims)) {
    const redirect = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.getAll().forEach(({ name, value }) => redirect.cookies.set(name, value))
    return redirect
  }
  if (!isLogin && data?.claims && role !== 'admin') return new NextResponse('No autorizado', { status: 403 })
  return response
}

export const config = { matcher: ['/((?!_next/|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)'] }
