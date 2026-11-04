import { describe, expect, it } from 'vitest'
import { aprendePadelCoursePrices, courseCatalog, priceCourseEnrollment } from '@/lib/payments/courses'
import {
  aprendePadelExtras as extras,
  dropInPrice,
  privateClassIssues,
  privateClassPrice,
} from '@/lib/payments/extras'
import { aprendePadelCatalog } from '@/lib/payments/seed-catalog'

const segments = aprendePadelCatalog.segments

describe('drop-in classes', () => {
  it('charges 15 € for a one hour class and scales with the duration', () => {
    expect(dropInPrice(extras, 60)).toBe(1500)
    expect(dropInPrice(extras, 90)).toBe(2250)
  })
})

describe('private classes', () => {
  it('one student pays 30 € plus the court', () => {
    const price = privateClassPrice({
      extras,
      students: 1,
      durationMinutes: 60,
      courtPricePerHourCents: 1200,
    })
    expect(price.perStudentCents).toEqual([4200])
    expect(price.totalCents).toBe(4200)
  })
  it('two students pay 25 € each plus half the court', () => {
    const price = privateClassPrice({
      extras,
      students: 2,
      durationMinutes: 60,
      courtPricePerHourCents: 1200,
    })
    expect(price.perStudentCents).toEqual([3100, 3100])
    expect(price.totalCents).toBe(6200)
  })
  it('splits an odd court price without losing cents', () => {
    const price = privateClassPrice({
      extras,
      students: 2,
      durationMinutes: 60,
      courtPricePerHourCents: 1001,
    })
    expect(price.courtCents.reduce((sum, value) => sum + value, 0)).toBe(1001)
  })
  it('scales a 90 minute class', () => {
    const price = privateClassPrice({
      extras,
      students: 1,
      durationMinutes: 90,
      courtPricePerHourCents: 1200,
    })
    expect(price.perStudentCents).toEqual([4500 + 1800])
  })
  it('rejects more than two students', () => {
    expect(() =>
      privateClassPrice({ extras, students: 3, durationMinutes: 60, courtPricePerHourCents: 0 }),
    ).toThrow()
  })
  it('allows 1 or 2 students from 13 years old', () => {
    expect(privateClassIssues(extras, [30])).toEqual([])
    expect(privateClassIssues(extras, [30, 13])).toEqual([])
    expect(privateClassIssues(extras, [12])).toHaveLength(1)
    expect(privateClassIssues(extras, [30, 30, 30])).toHaveLength(1)
    expect(privateClassIssues(extras, [])).toHaveLength(1)
  })
})

describe('course pricing (June intensive)', () => {
  const adult = { birthDate: '1990-05-12' }
  const child = { birthDate: '2017-03-02' }
  const price = (members: { id: string; birthDate: string }[]) =>
    priceCourseEnrollment(members, aprendePadelCoursePrices, segments, '2027-05-31').prices.reduce(
      (sum, p) => sum + p.amountCents,
      0,
    )

  it('prices individuals by age segment', () => {
    expect(price([{ id: 'c', ...child }])).toBe(5000)
    expect(price([{ id: 'a', ...adult }])).toBe(7000)
    expect(price([{ id: 's', birthDate: '1950-01-01' }])).toBe(6000)
  })
  it('applies the family offers', () => {
    expect(
      price([
        { id: 'a', ...adult },
        { id: 'b', ...adult },
      ]),
    ).toBe(12000)
    expect(
      price([
        { id: 'a', ...adult },
        { id: 'b', ...adult },
        { id: 'c', ...child },
      ]),
    ).toBe(16000)
    expect(
      price([
        { id: 'a', ...adult },
        { id: 'b', ...adult },
        { id: 'c', ...child },
        { id: 'd', ...child },
      ]),
    ).toBe(18000)
  })
  it('falls back to individual prices when the family is incomplete', () => {
    expect(
      price([
        { id: 'a', ...adult },
        { id: 'c', ...child },
        { id: 'd', ...child },
      ]),
    ).toBe(7000 + 5000 + 5000)
  })
  it('takes the age on the first day of the course', () => {
    expect(price([{ id: 'x', birthDate: '2014-06-01' }])).toBe(5000)
    expect(price([{ id: 'x', birthDate: '2014-05-30' }])).toBe(7000)
  })
  it('exposes the prices as a single-frequency catalog', () => {
    expect(courseCatalog(segments, aprendePadelCoursePrices).rates.every((r) => r.classesPerWeek === 1)).toBe(
      true,
    )
  })
})
