import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isModuleRoute } from '@/lib/modules'

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { pathname } = request.nextUrl
  const isLogin = pathname.startsWith('/login')
  const isProtected = pathname === '/' || pathname.startsWith('/platform') || isModuleRoute(pathname)
  if (!isLogin && !isProtected) return response

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return new NextResponse('Supabase configuration is incomplete', { status: 500 })

  const supabase = createServerClient(url, key, {
    cookieOptions: authCookieOptions,
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
  const claims = data?.claims
  const appMetadata = claims?.app_metadata
  const allowed = appMetadata?.role === 'admin' || appMetadata?.is_platform_admin === true

  if (isLogin) {
    return claims && !error && allowed ? NextResponse.redirect(new URL('/', request.url)) : response
  }
  if (error || !claims) return redirectToLogin(request, response)
  if (!allowed) {
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
    redirect.cookies.set(name, value, { ...authCookieOptions, ...(value ? {} : { maxAge: 0 }) })
  }
  if (clearAuth) {
    for (const { name } of request.cookies.getAll()) {
      if (name.startsWith('sb-') && name.includes('-auth-token')) {
        redirect.cookies.set(name, '', { ...authCookieOptions, maxAge: 0 })
      }
    }
  }
  redirect.headers.set('Cache-Control', 'private, no-store')
  return redirect
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)'],
}
