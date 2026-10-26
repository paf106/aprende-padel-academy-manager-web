import type { ZodType } from 'zod'

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> }

export function validate<T>(schema: ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input)
  if (result.success) return { ok: true, data: result.data }
  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_')
    errors[key] ??= issue.message
  }
  return { ok: false, errors }
}
