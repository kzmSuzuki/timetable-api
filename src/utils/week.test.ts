import { afterEach, describe, expect, it, vi } from 'vitest'
import { getWeekRange } from './week'

describe('getWeekRange', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns Monday to Friday for current week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T09:00:00+09:00')) // Wednesday

    const range = getWeekRange(0)

    expect(range).toEqual({
      start: '2026-02-16',
      end: '2026-02-20',
    })
  })

  it('returns next week when offset is 1', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T09:00:00+09:00'))

    const range = getWeekRange(1)

    expect(range).toEqual({
      start: '2026-02-23',
      end: '2026-02-27',
    })
  })
})
