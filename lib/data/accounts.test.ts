import { describe, expect, it } from 'vitest'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import type { Student } from '@/lib/data/types'
import type { StudentInput } from '@/lib/classes/student-schema'

const inputOf = (s: Student, accountId: string): StudentInput => ({
  firstName: s.firstName,
  lastName: s.lastName,
  birthDate: s.birthDate,
  gender: s.gender,
  category: s.category,
  level: s.level,
  clubId: s.clubId,
  extraClubIds: s.extraClubIds,
  email: s.email,
  phone: s.phone,
  guardianName: s.guardianName,
  guardianPhone: s.guardianPhone,
  accountId,
})

describe('billing accounts', () => {
  it('moving a student to another account removes the empty account left behind', () => {
    const base = makeAppData()
    const ana = base.students.find((s) => s.firstName === 'Ana')!
    const luis = base.students.find((s) => s.firstName === 'Luis')!
    const next = mutations.updateStudent(base, luis.id, inputOf(luis, ana.accountId))
    expect(next.accounts.some((a) => a.id === luis.accountId)).toBe(false)
    expect(next.students.find((s) => s.id === luis.id)?.accountId).toBe(ana.accountId)
    expect(next.accounts).toHaveLength(base.accounts.length - 1)
  })

  it('keeps an account that has payments', () => {
    const base = makeAppData()
    const ana = base.students.find((s) => s.firstName === 'Ana')!
    const luis = base.students.find((s) => s.firstName === 'Luis')!
    const paid = mutations.addPayment(base, {
      accountId: luis.accountId,
      month: '2026-11',
      amountCents: 1000,
      method: 'cash',
      paidOn: '2026-11-05',
    })
    const next = mutations.updateStudent(paid, luis.id, inputOf(luis, ana.accountId))
    expect(next.accounts.some((a) => a.id === luis.accountId)).toBe(true)
  })

  it('keeps an account that still has members', () => {
    const base = makeAppData()
    const hijo = base.students.find((s) => s.firstName === 'Hijo')!
    const ana = base.students.find((s) => s.firstName === 'Ana')!
    const next = mutations.updateStudent(base, hijo.id, inputOf(hijo, ana.accountId))
    expect(next.accounts.some((a) => a.id === hijo.accountId)).toBe(true)
  })

  it('renames an account and ignores empty names', () => {
    const base = makeAppData()
    const id = base.accounts[0].id
    expect(mutations.renameAccount(base, id, '  Jesús y Denisa ').accounts[0].name).toBe('Jesús y Denisa')
    expect(mutations.renameAccount(base, id, '  ')).toBe(base)
  })
})
