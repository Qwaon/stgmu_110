import { describe, it, expect } from 'vitest'
import { isActiveBookingVisible, validateBookingWindow } from '@/lib/bookings'

describe('validateBookingWindow', () => {
  it('accepts open-ended bookings', () => {
    expect(validateBookingWindow('2099-01-01T10:00:00.000Z', null)).toBeNull()
  })

  it('rejects invalid start date', () => {
    expect(validateBookingWindow('bad-date', null)).toBe('Некорректное время начала')
  })

  it('rejects invalid end date', () => {
    expect(validateBookingWindow('2099-01-01T10:00:00.000Z', 'bad-date')).toBe('Некорректное время окончания')
  })

  it('rejects non-increasing intervals', () => {
    expect(
      validateBookingWindow('2099-01-01T10:00:00.000Z', '2099-01-01T10:00:00.000Z')
    ).toBe('Время окончания должно быть позже начала')
  })
})

describe('isActiveBookingVisible', () => {
  const nowIso = '2099-01-01T12:00:00.000Z'

  it('keeps open-ended booking visible', () => {
    expect(isActiveBookingVisible(null, nowIso)).toBe(true)
  })

  it('keeps future booking visible', () => {
    expect(isActiveBookingVisible('2099-01-01T12:30:00.000Z', nowIso)).toBe(true)
  })

  it('hides expired booking', () => {
    expect(isActiveBookingVisible('2099-01-01T11:59:59.000Z', nowIso)).toBe(false)
  })
})
