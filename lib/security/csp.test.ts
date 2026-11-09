import { describe, expect, it } from 'vitest'
import { buildCsp, newNonce } from '@/lib/security/csp'

const directive = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? ''

describe('content security policy', () => {
  const production = buildCsp('abc', { supabaseUrl: 'https://p.supabase.co', development: false })

  it('only allows scripts that carry the nonce, without unsafe-inline or unsafe-eval', () => {
    const script = directive(production, 'script-src')
    expect(script).toContain("'nonce-abc'")
    expect(script).toContain("'strict-dynamic'")
    expect(script).not.toContain('unsafe-inline')
    expect(script).not.toContain('unsafe-eval')
  })

  it('talks only to itself and to the project, and forces https in production', () => {
    expect(directive(production, 'connect-src')).toBe(
      "connect-src 'self' https://p.supabase.co wss://p.supabase.co",
    )
    expect(production).toContain('upgrade-insecure-requests')
    expect(directive(production, 'frame-ancestors')).toBe("frame-ancestors 'none'")
  })

  it('lets development rebuild stack traces and reach the local server', () => {
    const development = buildCsp('abc', { development: true })
    expect(directive(development, 'script-src')).toContain("'unsafe-eval'")
    expect(development).not.toContain('upgrade-insecure-requests')
  })

  it('does not turn an invalid project url into a wildcard', () => {
    const csp = buildCsp('abc', { supabaseUrl: 'not a url', development: false })
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self'")
    expect(csp).not.toContain('*')
  })

  it('uses a different nonce each time', () => {
    expect(newNonce()).not.toBe(newNonce())
  })
})
