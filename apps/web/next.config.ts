import type { NextConfig } from 'next'
const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@aprende-padel/core', '@aprende-padel/db', '@aprende-padel/module-kit', '@aprende-padel/ui'],
  async headers() {
    const connectSource = process.env.NODE_ENV === 'development'
      ? "connect-src 'self' ws: wss: http://localhost:*"
      : "connect-src 'self' https://*.supabase.co wss://*.supabase.co"
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; ${connectSource}; upgrade-insecure-requests` },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
}
export default config
