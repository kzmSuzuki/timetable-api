import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { timetableRoute } from './timetable'
import type { AppEnv } from '../types/env'
import type { D1DatabaseLike } from '../types/storage'

function createMockDb(results: unknown[] = []) {
  const all = vi.fn(async () => ({ results }))
  const bind = vi.fn(() => ({ all }))
  const prepare = vi.fn(() => ({ bind }))
  const batch = vi.fn(async () => [])
  const db = { prepare, batch } as unknown as D1DatabaseLike
  return { db, prepare, bind, all, batch }
}

function createApp(bindings: AppEnv['Bindings']) {
  const app = new Hono<AppEnv>()
  app.route('/api/timetable', timetableRoute)
  return app
}

async function requestWithKey(
  app: Hono<AppEnv>,
  url: string,
  apiKey?: string,
  bindings?: AppEnv['Bindings']
) {
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-API-Key'] = apiKey

  return app.request(
    `http://localhost${url}`,
    {
      method: 'GET',
      headers,
    },
    bindings
  )
}

describe('GET /api/timetable', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns timetable for valid grade and week_offset', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T09:00:00+09:00'))

    const row = {
      day_of_week: 1,
      period: 1,
      subject: '数学',
      classroom: '講義室1',
    }
    const { db, bind } = createMockDb([row])
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await requestWithKey(
      app,
      '/api/timetable?grade=1&week_offset=0',
      'read-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(bind).toHaveBeenCalledWith(1, '2026-02-16', '2026-02-20')
    expect(body).toMatchObject({
      week_start: '2026-02-16',
      week_end: '2026-02-20',
      grade: 1,
      timetable: [row],
    })
  })

  it('returns timetable for grade=2 and week_offset=1 (next week)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T09:00:00+09:00'))

    const row = {
      day_of_week: 2,
      period: 3,
      subject: '物理',
      classroom: '実験室A',
    }
    const { db, bind } = createMockDb([row])
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await requestWithKey(
      app,
      '/api/timetable?grade=2&week_offset=1',
      'read-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(bind).toHaveBeenCalledWith(2, '2026-02-23', '2026-02-27')
    expect(body).toMatchObject({
      week_start: '2026-02-23',
      week_end: '2026-02-27',
      grade: 2,
      timetable: [row],
    })
  })

  it('returns 400 when grade is out of range (grade=5)', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await requestWithKey(
      app,
      '/api/timetable?grade=5&week_offset=0',
      'read-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: 'Bad Request',
      message: 'grade must be between 1 and 4',
    })
  })

  it('returns 400 when grade is out of range (grade=0)', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await requestWithKey(
      app,
      '/api/timetable?grade=0&week_offset=0',
      'read-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: 'Bad Request',
      message: 'grade must be between 1 and 4',
    })
  })

  it('returns 400 when week_offset is out of range (week_offset=3)', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await requestWithKey(
      app,
      '/api/timetable?grade=1&week_offset=3',
      'read-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: 'Bad Request',
      message: 'week_offset must be between 0 and 2',
    })
  })

  it('returns 400 when week_offset is out of range (week_offset=-1)', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await requestWithKey(
      app,
      '/api/timetable?grade=1&week_offset=-1',
      'read-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: 'Bad Request',
      message: 'week_offset must be between 0 and 2',
    })
  })

  it('returns 400 when required params are missing', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await requestWithKey(app, '/api/timetable?grade=1', 'read-key', bindings)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: 'Bad Request',
      message: 'grade and week_offset are required',
    })
  })

  it('returns 401 with invalid API key', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await requestWithKey(
      app,
      '/api/timetable?grade=1&week_offset=0',
      'invalid',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid API key',
    })
  })
})
