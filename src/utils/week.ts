function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * week_offset から対象週の月曜日〜金曜日の日付範囲を算出
 * @param weekOffset 0=今週, 1=来週, 2=再来週
 */
export function getWeekRange(weekOffset: number): { start: string; end: string } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=日, 1=月, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday + weekOffset * 7)

  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  return {
    start: formatDate(monday),
    end: formatDate(friday),
  }
}
