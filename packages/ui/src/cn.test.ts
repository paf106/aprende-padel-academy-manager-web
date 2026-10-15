import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('merges conflicting Tailwind utilities while preserving unrelated classes', () => {
    expect(cn('px-2 py-1 text-sm', false, 'px-4 text-base')).toBe('py-1 px-4 text-base')
  })

  it('preserves arbitrary classes and conditional class values', () => {
    expect(cn('rounded-xl', null, 'bg-[color:var(--surface)]', 'opacity-50')).toBe(
      'rounded-xl bg-[color:var(--surface)] opacity-50',
    )
  })
})
