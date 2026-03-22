import type { D1DatabaseLike } from './storage'

export type AppEnv = {
  Bindings: {
    API_KEY_READ: string
    API_KEY_WRITE: string
    timetable_db: D1DatabaseLike
  }
}
