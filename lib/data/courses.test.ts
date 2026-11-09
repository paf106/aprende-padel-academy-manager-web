import { describe, expect, it } from 'vitest'
import { emptyCourseInput } from '@/lib/classes/course-schema'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'

describe('courses', () => {
  it('creating the June intensive charges a single payment per enrolled child', () => {
    const state = makeAppData()
    const course = state.courses[0]
    const charges = state.extraCharges.filter((c) => c.courseId === course.id)
    expect(charges).toHaveLength(course.studentIds.length)
    expect(charges.every((c) => c.kind === 'course' && c.month === '2027-05' && c.amountCents === 5000)).toBe(
      true,
    )
  })

  it('creating a course generates its classes and charges family offers', () => {
    const base = makeAppData()
    const family = base.students.filter((s) => s.firstName === 'Madre' || s.firstName === 'Padre')
    const after = mutations.createCourse(base, {
      ...emptyCourseInput,
      name: 'Intensivo familiar',
      clubId: base.clubs[0].id,
      teacherId: base.teachers[0].id,
      category: 'adult',
      startsOn: '2027-06-07',
      endsOn: '2027-06-10',
      start: '10:00',
      studentIds: family.map((s) => s.id),
    })
    const course = after.courses.find((c) => c.name === 'Intensivo familiar')!
    expect(after.sessions.filter((s) => s.courseId === course.id).map((s) => s.date)).toEqual([
      '2027-06-07',
      '2027-06-08',
      '2027-06-09',
      '2027-06-10',
    ])
    const charges = after.extraCharges.filter((c) => c.courseId === course.id)
    expect(charges.reduce((sum, c) => sum + c.amountCents, 0)).toBe(12000)
  })

  it('deactivating a course removes its pending classes and charges; reactivating restores them', () => {
    const base = makeAppData()
    const course = base.courses[0]
    const off = mutations.setCourseActive(base, course.id, false)
    expect(off.sessions.filter((s) => s.courseId === course.id)).toHaveLength(0)
    expect(off.extraCharges.filter((c) => c.courseId === course.id)).toHaveLength(0)
    const on = mutations.setCourseActive(off, course.id, true)
    expect(on.sessions.filter((s) => s.courseId === course.id)).toHaveLength(4)
    expect(on.extraCharges.filter((c) => c.courseId === course.id)).toHaveLength(course.studentIds.length)
  })

  it('changing the course prices recalculates the course charges', () => {
    const base = makeAppData()
    const state = mutations.setCoursePrices(base, {
      ...base.coursePrices,
      rates: base.coursePrices.rates.map((r) => (r.segmentId === 'child' ? { ...r, priceCents: 4000 } : r)),
    })
    const charges = state.extraCharges.filter((c) => c.courseId === state.courses[0].id)
    expect(charges.every((c) => c.amountCents === 4000)).toBe(true)
  })

  it('deleting a course removes everything linked to it', () => {
    const base = makeAppData()
    const course = base.courses[0]
    const state = mutations.deleteCourse(base, course.id)
    expect(state.courses.find((c) => c.id === course.id)).toBeUndefined()
    expect(state.sessions.some((s) => s.courseId === course.id)).toBe(false)
    expect(state.extraCharges.some((c) => c.courseId === course.id)).toBe(false)
  })
})
