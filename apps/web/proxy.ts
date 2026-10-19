import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isModuleRoute } from '@aprende-padel/module-kit'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const isLogin = request.nextUrl.pathname.startsWith('/login')
  const isProtected = request.nextUrl.pathname === '/' || isModuleRoute(request.nextUrl.pathname)
  if (!isLogin && !isProtected) return response
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return new NextResponse('Configuración de Supabase incompleta', { status: 500 })
  const supabase = createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
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
  if (isLogin && data?.claims && !error && role === 'admin') {
    const { data: profile } = await supabase
      .schema('core')
      .from('profiles')
      .select('id')
      .eq('id', data.claims.sub)
      .eq('role', 'admin')
      .eq('active', true)
      .maybeSingle()
    if (profile) return NextResponse.redirect(new URL('/', request.url))
  }
  if (!isLogin && (error || !data?.claims)) {
    return redirectToLogin(request, response)
  }
  if (!isLogin && data?.claims && role !== 'admin') {
    await supabase.auth.signOut()
    return redirectToLogin(request, response, 'unauthorized', true)
  }
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

function redirectToLogin(request: NextRequest, response: NextResponse, error?: string, clearAuth = false) {
  const url = new URL('/login', request.url)
  if (error) url.searchParams.set('error', error)
  const redirect = NextResponse.redirect(url)
  for (const { name, value } of response.cookies.getAll()) {
    redirect.cookies.set(name, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(clearAuth && name.startsWith('sb-') && name.includes('-auth-token')
        ? { maxAge: 0 }
        : value
          ? {}
          : { maxAge: 0 }),
    })
  }
  if (clearAuth) {
    for (const { name } of request.cookies.getAll()) {
      if (name.startsWith('sb-') && name.includes('-auth-token')) {
        redirect.cookies.set(name, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        })
      }
    }
  }
  redirect.headers.set('Cache-Control', 'private, no-store')
  return redirect
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)'],
}
