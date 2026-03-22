import { describe, expect, it, vi } from 'vitest'
import app from './index'
import type { AppEnv } from './types/env'
import type { D1DatabaseLike } from './types/storage'

function createBindings(): AppEnv['Bindings'] {
  const all = vi.fn(async () => ({ results: [] }))
  const bind = vi.fn(() => ({ all }))
  const prepare = vi.fn(() => ({ bind }))
  const batch = vi.fn(async () => [])
  const db = { prepare, batch } as unknown as D1DatabaseLike

  return {
    API_KEY_READ: 'read-key',
    API_KEY_WRITE: 'write-key',
    timetable_db: db,
  }
}

describe('app entrypoint', () => {
  it('returns 200 for health check', async () => {
    const res = await app.request('http://localhost/health', {}, createBindings())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ status: 'ok' })
  })
})
