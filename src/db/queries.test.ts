import { describe, expect, it, vi } from 'vitest'
import { syncTimetable } from './queries'
import type { D1DatabaseLike } from '../types/storage'

describe('syncTimetable', () => {
  it('builds delete + insert statements and runs batch', async () => {
    const preparedQueries: string[] = []
    const boundArgs: unknown[][] = []

    const batch = vi.fn(async () => [])
    const prepare = vi.fn((query: string) => {
      preparedQueries.push(query)
      return {
        bind: (...values: unknown[]) => {
          boundArgs.push(values)
          return {
            all: async () => ({ results: [] }),
          }
        },
      }
    })

    const db: D1DatabaseLike = { prepare, batch }
    const count = await syncTimetable(db, 1, [
      { date: '2026-02-16', period: 1, subject: '数学', classroom: '講義室1' }, // Monday
      { date: '2026-02-17', period: 2, subject: '英語', classroom: '講義室2' }, // Tuesday
    ])

    expect(count).toBe(2)
    expect(prepare).toHaveBeenCalledTimes(3)
    expect(preparedQueries[0]).toContain('DELETE FROM timetable WHERE grade = ? AND date IN (?, ?)')
    expect(preparedQueries[1]).toContain('INSERT INTO timetable')
    expect(boundArgs[0]).toEqual([1, '2026-02-16', '2026-02-17'])
    expect(boundArgs[1]).toEqual([1, '2026-02-16', 1, 1, '数学', '講義室1'])
    expect(boundArgs[2]).toEqual([1, '2026-02-17', 2, 2, '英語', '講義室2'])
    expect(batch).toHaveBeenCalledTimes(1)
  })

  it('returns 0 and skips batch when entries are empty', async () => {
    const batch = vi.fn(async () => [])
    const prepare = vi.fn(() => ({
      bind: () => ({
        all: async () => ({ results: [] }),
      }),
    }))

    const db: D1DatabaseLike = { prepare, batch }
    const count = await syncTimetable(db, 1, [])

    expect(count).toBe(0)
    expect(prepare).not.toHaveBeenCalled()
    expect(batch).not.toHaveBeenCalled()
  })
})
