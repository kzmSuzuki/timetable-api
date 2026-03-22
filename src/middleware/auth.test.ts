import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { readAuth, writeAuth } from './auth'
import type { AppEnv } from '../types/env'
import type { D1DatabaseLike } from '../types/storage'

function createMockDb(): D1DatabaseLike {
  return {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [] }),
      }),
    }),
    batch: async () => [],
  }
}

const bindings: AppEnv['Bindings'] = {
  API_KEY_READ: 'read-key',
  API_KEY_WRITE: 'write-key',
  timetable_db: createMockDb(),
}

function createApp() {
  const app = new Hono<AppEnv>()

  app.get('/read', readAuth, (c) => c.json({ status: 'ok' }))
  app.post('/write', writeAuth, (c) => c.json({ status: 'ok' }))

  return app
}

async function requestWithKey(
  app: Hono<AppEnv>,
  method: 'GET' | 'POST',
  path: string,
  apiKey?: string
) {
  const headers = new Headers()
  if (apiKey) headers.set('X-API-Key', apiKey)

  return app.request(
    `http://localhost${path}`,
    {
      method,
      headers,
    },
    bindings
  )
}

describe('auth middleware', () => {
  it('allows GET with read key', async () => {
    const app = createApp()
    const response = await requestWithKey(app, 'GET', '/read', bindings.API_KEY_READ)

    expect(response.status).toBe(200)
  })

  it('allows GET with write key', async () => {
    const app = createApp()
    const response = await requestWithKey(app, 'GET', '/read', bindings.API_KEY_WRITE)

    expect(response.status).toBe(200)
  })

  it('rejects POST with read key', async () => {
    const app = createApp()
    const response = await requestWithKey(app, 'POST', '/write', bindings.API_KEY_READ)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      error: 'Unauthorized',
      message: 'Write permission required',
    })
  })

  it('allows POST with write key', async () => {
    const app = createApp()
    const response = await requestWithKey(app, 'POST', '/write', bindings.API_KEY_WRITE)

    expect(response.status).toBe(200)
  })

  it('rejects GET with invalid key', async () => {
    const app = createApp()
    const response = await requestWithKey(app, 'GET', '/read', 'invalid-key')
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid API key',
    })
  })

  it('rejects GET with missing key', async () => {
    const app = createApp()
    const response = await requestWithKey(app, 'GET', '/read')
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid API key',
    })
  })
})
