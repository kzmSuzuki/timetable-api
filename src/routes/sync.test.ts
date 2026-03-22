import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import { syncRoute } from './sync'
import type { AppEnv } from '../types/env'
import type { D1DatabaseLike } from '../types/storage'

function createMockDb() {
  const all = vi.fn(async () => ({ results: [] }))
  const bind = vi.fn(() => ({ all }))
  const prepare = vi.fn(() => ({ bind }))
  const batch = vi.fn(async () => [])
  const db: D1DatabaseLike = { prepare, batch }
  return { db, prepare, bind, batch }
}

function createApp(bindings: AppEnv['Bindings']) {
  const app = new Hono<AppEnv>()
  app.route('/api/sync', syncRoute)
  return app
}

async function postWithKey(
  app: Hono<AppEnv>,
  body: unknown,
  apiKey?: string,
  bindings?: AppEnv['Bindings']
) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (apiKey) headers.set('X-API-Key', apiKey)

  return app.request(
    'http://localhost/api/sync',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
    bindings
  )
}

describe('POST /api/sync', () => {
  it('syncs multiple entries with write key', async () => {
    const { db, batch } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await postWithKey(
      app,
      {
        grade: 1,
        entries: [
          { date: '2026-02-16', period: 1, subject: '数学', classroom: '講義室1' },
          { date: '2026-02-16', period: 2, subject: '英語', classroom: '講義室2' },
        ],
      },
      'write-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(batch).toHaveBeenCalledTimes(1)
    expect(body).toMatchObject({
      status: 'ok',
      synced_count: 2,
    })
  })

  it('overwrites existing entries when same date and period are sent again (UPSERT)', async () => {
    const { db, batch } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const entry = { date: '2026-02-16', period: 1, subject: '数学', classroom: '講義室1' }
    const updatedEntry = { date: '2026-02-16', period: 1, subject: '物理', classroom: '実験室A' }

    const firstResponse = await postWithKey(
      app,
      { grade: 1, entries: [entry] },
      'write-key',
      bindings
    )
    const firstBody = await firstResponse.json()

    expect(firstResponse.status).toBe(200)
    expect(firstBody).toMatchObject({ status: 'ok', synced_count: 1 })
    expect(batch).toHaveBeenCalledTimes(1)

    const secondResponse = await postWithKey(
      app,
      { grade: 1, entries: [updatedEntry] },
      'write-key',
      bindings
    )
    const secondBody = await secondResponse.json()

    expect(secondResponse.status).toBe(200)
    expect(secondBody).toMatchObject({ status: 'ok', synced_count: 1 })
    expect(batch).toHaveBeenCalledTimes(2)
  })

  it('returns synced_count=0 when entries is empty', async () => {
    const { db, batch } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await postWithKey(
      app,
      {
        grade: 1,
        entries: [],
      },
      'write-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(batch).not.toHaveBeenCalled()
    expect(body).toMatchObject({
      status: 'ok',
      synced_count: 0,
    })
  })

  it('returns 400 when grade is missing', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await postWithKey(
      app,
      {
        entries: [],
      },
      'write-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: 'Bad Request',
      message: 'grade and entries array are required',
    })
  })

  it('returns 400 when entries is missing', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await postWithKey(
      app,
      {
        grade: 1,
      },
      'write-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: 'Bad Request',
      message: 'grade and entries array are required',
    })
  })

  it('returns 400 when period is out of range', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await postWithKey(
      app,
      {
        grade: 1,
        entries: [{ date: '2026-02-16', period: 5, subject: '数学', classroom: '講義室1' }],
      },
      'write-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: 'Bad Request',
      message: 'period must be between 1 and 4',
    })
  })

  it('returns 401 when using read key', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await postWithKey(
      app,
      {
        grade: 1,
        entries: [],
      },
      'read-key',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      error: 'Unauthorized',
      message: 'Write permission required',
    })
  })

  it('returns 401 when using invalid key', async () => {
    const { db } = createMockDb()
    const bindings: AppEnv['Bindings'] = {
      API_KEY_READ: 'read-key',
      API_KEY_WRITE: 'write-key',
      timetable_db: db,
    }
    const app = createApp(bindings)

    const response = await postWithKey(
      app,
      {
        grade: 1,
        entries: [],
      },
      'invalid',
      bindings
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      error: 'Unauthorized',
      message: 'Write permission required',
    })
  })
})
