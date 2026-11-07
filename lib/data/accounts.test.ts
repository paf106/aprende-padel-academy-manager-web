import { describe, expect, it } from 'vitest'
import { makeAppData } from '@/lib/data/fixtures'
import { diffRows, toRows } from '@/lib/db/mapping'
import { buildSteps } from '@/lib/db/steps'
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

describe('individual account names', () => {
  it('an individual account is named after its student, with the full name', () => {
    const base = makeAppData()
    const ana = base.students.find((s) => s.firstName === 'Ana')!
    expect(base.accounts.find((a) => a.id === ana.accountId)?.name).toBe('Ana Test')
    const created = mutations.createStudent(base, {
      ...inputOf(ana, ''),
      firstName: 'Nuria',
      lastName: 'Blanco Sabroso',
    })
    const nuria = created.students.find((s) => s.firstName === 'Nuria')!
    expect(created.accounts.find((a) => a.id === nuria.accountId)?.name).toBe('Nuria Blanco Sabroso')
  })

  it('a student without last name gives an account with just the first name', () => {
    const base = makeAppData()
    const ana = base.students.find((s) => s.firstName === 'Ana')!
    const created = mutations.createStudent(base, { ...inputOf(ana, ''), firstName: 'Denisa', lastName: '' })
    const denisa = created.students.find((s) => s.firstName === 'Denisa')!
    expect(created.accounts.find((a) => a.id === denisa.accountId)?.name).toBe('Denisa')
  })

  it('renaming the student renames the individual account', () => {
    const base = makeAppData()
    const ana = base.students.find((s) => s.firstName === 'Ana')!
    const next = mutations.updateStudent(base, ana.id, {
      ...inputOf(ana, ana.accountId),
      lastName: 'García López',
    })
    expect(next.accounts.find((a) => a.id === ana.accountId)?.name).toBe('Ana García López')
  })

  it('a shared account keeps its own name and cannot be renamed after one student when individual', () => {
    const base = makeAppData()
    const madre = base.students.find((s) => s.firstName === 'Madre')!
    const shared = mutations.renameAccount(base, madre.accountId, 'Los Test')
    expect(shared.accounts.find((a) => a.id === madre.accountId)?.name).toBe('Los Test')
    const renamedMadre = mutations.updateStudent(shared, madre.id, {
      ...inputOf(madre, madre.accountId),
      firstName: 'Marta',
    })
    expect(renamedMadre.accounts.find((a) => a.id === madre.accountId)?.name).toBe('Los Test')
    const ana = base.students.find((s) => s.firstName === 'Ana')!
    expect(mutations.renameAccount(base, ana.accountId, 'Otro')).toBe(base)
  })

  it('when a couple splits, the account left with one student takes their name', () => {
    const base = makeAppData()
    const hijo = base.students.find((s) => s.firstName === 'Hijo')!
    const padre = base.students.find((s) => s.firstName === 'Padre')!
    const madre = base.students.find((s) => s.firstName === 'Madre')!
    let state = mutations.renameAccount(base, hijo.accountId, 'Familia')
    state = mutations.deleteStudent(state, padre.id)
    state = mutations.deleteStudent(state, hijo.id)
    expect(state.accounts.find((a) => a.id === madre.accountId)?.name).toBe('Madre Test')
  })
})

describe('importing students', () => {
  it('creates all of them at once, each with an individual account, and flags the ones to review', () => {
    const base = makeAppData()
    const ana = base.students.find((s) => s.firstName === 'Ana')!
    const input = (firstName: string, lastName: string): StudentInput => ({
      ...inputOf(ana, ''),
      firstName,
      lastName,
      accountId: '',
    })
    const next = mutations.importStudents(base, [
      { input: input('Nuria', 'Blanco Sabroso'), needsReview: false },
      { input: input('Hugo', ''), needsReview: true },
    ])
    expect(next.students).toHaveLength(base.students.length + 2)
    expect(next.accounts).toHaveLength(base.accounts.length + 2)
    const nuria = next.students.find((s) => s.firstName === 'Nuria')!
    const hugo = next.students.find((s) => s.firstName === 'Hugo')!
    expect(nuria.needsReview).toBe(false)
    expect(hugo.needsReview).toBe(true)
    expect(next.accounts.find((a) => a.id === nuria.accountId)?.name).toBe('Nuria Blanco Sabroso')
    expect(next.accounts.find((a) => a.id === hugo.accountId)?.name).toBe('Hugo')
  })

  it('is saved in one go', () => {
    const base = makeAppData()
    const ana = base.students.find((s) => s.firstName === 'Ana')!
    const items = ['A', 'B', 'C'].map((firstName) => ({
      input: { ...inputOf(ana, ''), firstName, accountId: '' },
      needsReview: false,
    }))
    const steps = buildSteps(diffRows(toRows(base), toRows(mutations.importStudents(base, items))))
    expect(steps.map((s) => `${s.op} ${s.table} ${s.rows.length}`)).toEqual([
      'upsert core.billing_accounts 3',
      'upsert core.students 3',
    ])
  })
})
