import { describe, expect, it } from 'vitest'
import { emptyCourseInput } from '@/lib/classes/course-schema'
import { demoStore } from '@/lib/demo/store'

describe('courses in the demo store', () => {
  it('seeds the June intensive with a single payment per enrolled child', () => {
    const state = demoStore.getSnapshot()
    const course = state.courses[0]
    const charges = state.extraCharges.filter((c) => c.courseId === course.id)
    expect(charges).toHaveLength(course.studentIds.length)
    expect(charges.every((c) => c.kind === 'course' && c.month === '2027-05' && c.amountCents === 5000)).toBe(
      true,
    )
  })

  it('creating a course generates its classes and charges family offers', () => {
    const state = demoStore.getSnapshot()
    const family = state.students.filter((s) => s.accountId === 'fam-0' && s.active)
    expect(family.length).toBeGreaterThanOrEqual(3)
    const course = demoStore.createCourse({
      ...emptyCourseInput,
      name: 'Intensivo familiar',
      clubId: 'pioz',
      teacherId: 't1',
      category: 'adult',
      startsOn: '2027-06-07',
      endsOn: '2027-06-10',
      start: '10:00',
      studentIds: family.slice(0, 2).map((s) => s.id),
    })
    const after = demoStore.getSnapshot()
    expect(after.sessions.filter((s) => s.courseId === course.id).map((s) => s.date)).toEqual([
      '2027-06-07',
      '2027-06-08',
      '2027-06-09',
      '2027-06-10',
    ])
    const charges = after.extraCharges.filter((c) => c.courseId === course.id)
    expect(charges.reduce((sum, c) => sum + c.amountCents, 0)).toBeLessThanOrEqual(14000)
  })

  it('deactivating a course removes its pending classes and charges; reactivating restores them', () => {
    const course = demoStore.getSnapshot().courses[0]
    demoStore.setCourseActive(course.id, false)
    let state = demoStore.getSnapshot()
    expect(state.sessions.filter((s) => s.courseId === course.id)).toHaveLength(0)
    expect(state.extraCharges.filter((c) => c.courseId === course.id)).toHaveLength(0)
    demoStore.setCourseActive(course.id, true)
    state = demoStore.getSnapshot()
    expect(state.sessions.filter((s) => s.courseId === course.id)).toHaveLength(4)
    expect(state.extraCharges.filter((c) => c.courseId === course.id)).toHaveLength(course.studentIds.length)
  })

  it('changing the course prices recalculates the course charges', () => {
    const state = demoStore.getSnapshot()
    demoStore.setCoursePrices({
      ...state.coursePrices,
      rates: state.coursePrices.rates.map((r) => (r.segmentId === 'child' ? { ...r, priceCents: 4000 } : r)),
    })
    const course = demoStore.getSnapshot().courses[0]
    const charges = demoStore.getSnapshot().extraCharges.filter((c) => c.courseId === course.id)
    expect(charges.every((c) => c.amountCents === 4000)).toBe(true)
  })

  it('deleting a course removes everything linked to it', () => {
    const course = demoStore.getSnapshot().courses[0]
    demoStore.deleteCourse(course.id)
    const state = demoStore.getSnapshot()
    expect(state.courses.find((c) => c.id === course.id)).toBeUndefined()
    expect(state.sessions.some((s) => s.courseId === course.id)).toBe(false)
    expect(state.extraCharges.some((c) => c.courseId === course.id)).toBe(false)
  })
})
