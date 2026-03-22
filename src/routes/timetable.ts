import { Hono } from 'hono'
import { getTimetable } from '../db/queries'
import { readAuth } from '../middleware/auth'
import type { AppEnv } from '../types/env'
import { getWeekRange } from '../utils/week'

export const timetableRoute = new Hono<AppEnv>()

timetableRoute.get('/', readAuth, async (c) => {
  const gradeParam = c.req.query('grade')
  const weekOffsetParam = c.req.query('week_offset')

  if (gradeParam === undefined || weekOffsetParam === undefined) {
    return c.json(
      {
        error: 'Bad Request',
        message: 'grade and week_offset are required',
      },
      400
    )
  }

  const grade = Number(gradeParam)
  const weekOffset = Number(weekOffsetParam)

  if (!Number.isInteger(grade) || grade < 1 || grade > 4) {
    return c.json(
      {
        error: 'Bad Request',
        message: 'grade must be between 1 and 4',
      },
      400
    )
  }

  if (!Number.isInteger(weekOffset) || weekOffset < 0 || weekOffset > 2) {
    return c.json(
      {
        error: 'Bad Request',
        message: 'week_offset must be between 0 and 2',
      },
      400
    )
  }

  try {
    const { start, end } = getWeekRange(weekOffset)
    const timetable = await getTimetable(c.env.timetable_db, grade, start, end)

    return c.json({
      week_start: start,
      week_end: end,
      grade,
      timetable,
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
