import type { NextConfig } from 'next'
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const supabaseOrigins: string[] = []
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      try {
        const parsed = new URL(supabaseUrl)
        supabaseOrigins.push(parsed.origin)
        supabaseOrigins.push(`${parsed.protocol === 'https:' ? 'wss:' : 'ws:'}//${parsed.host}`)
      } catch {
        // An invalid URL is reported by the Supabase client at startup; don't
        // turn it into an accidental wildcard source in the CSP.
      }
    }
    const connectSource = [
      "'self'",
      ...supabaseOrigins,
      ...(process.env.NODE_ENV === 'development' ? ['ws:', 'wss:', 'http://localhost:*'] : []),
    ].join(' ')
    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: ${supabaseOrigins[0] ?? ''}; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src ${connectSource};${process.env.NODE_ENV === 'production' ? ' upgrade-insecure-requests;' : ''}`,
      },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]
    if (process.env.NODE_ENV === 'production')
      securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' })
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
export default config
