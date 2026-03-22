import type { D1BoundStatementLike, D1DatabaseLike } from '../types/storage'

export interface TimetableRow {
  day_of_week: number
  period: number
  subject: string
  classroom: string
}

export async function getTimetable(
  db: D1DatabaseLike,
  grade: number,
  startDate: string,
  endDate: string
): Promise<TimetableRow[]> {
  const result = await db
    .prepare<TimetableRow>(
      `SELECT day_of_week, period, subject, classroom
       FROM timetable
       WHERE grade = ? AND date BETWEEN ? AND ?
       ORDER BY day_of_week, period`
    )
    .bind(grade, startDate, endDate)
    .all()

  return result.results
}

export interface SyncEntry {
  date: string
  period: number
  subject: string
  classroom: string
}

/**
 * 指定した学年・日付範囲のデータを削除してから新規挿入（UPSERT）
 */
export async function syncTimetable(
  db: D1DatabaseLike,
  grade: number,
  entries: SyncEntry[]
): Promise<number> {
  if (entries.length === 0) {
    return 0
  }

  const statements: D1BoundStatementLike[] = []
  const dates = [...new Set(entries.map((entry) => entry.date))]
  const placeholders = dates.map(() => '?').join(', ')

  statements.push(
    db.prepare(`DELETE FROM timetable WHERE grade = ? AND date IN (${placeholders})`).bind(grade, ...dates)
  )

  for (const entry of entries) {
    const dayOfWeek = getDayOfWeek(entry.date)
    statements.push(
      db.prepare(
        `INSERT INTO timetable (grade, date, day_of_week, period, subject, classroom)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(grade, entry.date, dayOfWeek, entry.period, entry.subject, entry.classroom)
    )
  }

  await db.batch(statements)
  return entries.length
}

/**
 * YYYY-MM-DD 形式の日付から曜日番号を取得（月=1, 火=2, ...）
 */
function getDayOfWeek(dateStr: string): number {
  const day = new Date(dateStr).getDay() // 0=日, 1=月, ...
  return day === 0 ? 7 : day
}
