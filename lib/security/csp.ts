/** Content Security Policy with a nonce per request, so inline scripts need no 'unsafe-inline'. */
export function buildCsp(nonce: string, options: { supabaseUrl?: string; development: boolean }) {
  const origins: string[] = []
  if (options.supabaseUrl) {
    try {
      const parsed = new URL(options.supabaseUrl)
      origins.push(parsed.origin, `${parsed.protocol === 'https:' ? 'wss:' : 'ws:'}//${parsed.host}`)
    } catch {
      // An invalid URL is reported by the Supabase client; never turn it into a wildcard source.
    }
  }
  const connect = [
    "'self'",
    ...origins,
    ...(options.development ? ['ws:', 'wss:', 'http://localhost:*'] : []),
  ]
  // React needs eval in development to rebuild stack traces; production never gets it.
  const script = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(options.development ? ["'unsafe-eval'"] : []),
  ]
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `img-src 'self' data: blob: ${origins[0] ?? ''}`.trim(),
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${script.join(' ')}`,
    `connect-src ${connect.join(' ')}`,
    ...(options.development ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

export const newNonce = () => btoa(crypto.randomUUID())
