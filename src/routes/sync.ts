import { Hono } from 'hono'
import { syncTimetable, type SyncEntry } from '../db/queries'
import { writeAuth } from '../middleware/auth'
import type { AppEnv } from '../types/env'

type SyncRequestBody = {
  grade?: unknown
  entries?: unknown
}

type SyncEntryBody = {
  date?: unknown
  period?: unknown
  subject?: unknown
  classroom?: unknown
}

export const syncRoute = new Hono<AppEnv>()

syncRoute.post('/', writeAuth, async (c) => {
  try {
    const body = (await c.req.json()) as SyncRequestBody

    if (body.grade === undefined || !Array.isArray(body.entries)) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'grade and entries array are required',
        },
        400
      )
    }

    const grade = Number(body.grade)
    if (!Number.isInteger(grade) || grade < 1 || grade > 4) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'grade must be between 1 and 4',
        },
        400
      )
    }

    const entries = body.entries as SyncEntryBody[]
    const validatedEntries: SyncEntry[] = []

    for (const entry of entries) {
      if (
        typeof entry.date !== 'string' ||
        !entry.date ||
        !Number.isInteger(Number(entry.period)) ||
        typeof entry.subject !== 'string' ||
        !entry.subject ||
        typeof entry.classroom !== 'string' ||
        !entry.classroom
      ) {
        return c.json(
          {
            error: 'Bad Request',
            message: 'Each entry must have date, period, subject, and classroom',
          },
          400
        )
      }

      const period = Number(entry.period)
      if (period < 1 || period > 4) {
        return c.json(
          {
            error: 'Bad Request',
            message: 'period must be between 1 and 4',
          },
          400
        )
      }

      validatedEntries.push({
        date: entry.date,
        period,
        subject: entry.subject,
        classroom: entry.classroom,
      })
    }

    const syncedCount = await syncTimetable(c.env.timetable_db, grade, validatedEntries)

    return c.json({
      status: 'ok',
      synced_count: syncedCount,
    })
  } catch {
    return c.json(
      {
        error: 'Internal Server Error',
      },
      500
    )
  }
})
