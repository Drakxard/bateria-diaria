import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Session {
  day_index: number
  accumulated_minutes: number
  daily_goal_hours: number
  created_at: string
  updated_at: string
}

export async function getCurrentSession(): Promise<Session> {
  const result = await sql`
    SELECT * FROM sessions
    ORDER BY day_index DESC
    LIMIT 1
  `

  if (result.length === 0) {
    const [firstSession] = await sql`
      INSERT INTO sessions (day_index, accumulated_minutes, daily_goal_hours)
      VALUES (1, 0, 1)
      RETURNING *
    `
    return firstSession as Session
  }

  let latestSession = result[0] as Session
  const lastSessionDate = new Date(latestSession.created_at)
  const today = new Date()

  const toStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const lastStart = toStartOfDay(lastSessionDate)
  const todayStart = toStartOfDay(today)

  const msInDay = 1000 * 60 * 60 * 24
  const diffDays = Math.floor((todayStart.getTime() - lastStart.getTime()) / msInDay)

  if (diffDays <= 0) {
    return latestSession
  }

  const baseGoal = latestSession.daily_goal_hours || 1

  const startingDayIndex = latestSession.day_index

  for (let i = 1; i <= diffDays; i++) {
    const nextDayIndex = startingDayIndex + i
    latestSession = await createNewDay(nextDayIndex, baseGoal)
  }

  return latestSession
}

export async function updateSessionMinutes(dayIndex: number, minutes: number) {
  await sql`
    UPDATE sessions 
    SET accumulated_minutes = accumulated_minutes + ${minutes},
        updated_at = CURRENT_TIMESTAMP
    WHERE day_index = ${dayIndex}
  `
}

export async function updateDailyGoal(dayIndex: number, hours: number) {
  await sql`
    UPDATE sessions 
    SET daily_goal_hours = ${hours},
        updated_at = CURRENT_TIMESTAMP
    WHERE day_index = ${dayIndex}
  `
}

export async function createNewDay(dayIndex: number, goalHours = 1): Promise<Session> {
  const inserted = await sql`
    INSERT INTO sessions (day_index, accumulated_minutes, daily_goal_hours)
    VALUES (${dayIndex}, 0, ${goalHours})
    ON CONFLICT (day_index) DO NOTHING
    RETURNING *
  `

  if (inserted.length > 0) {
    return inserted[0] as Session
  }

  const existing = await sql`
    SELECT * FROM sessions
    WHERE day_index = ${dayIndex}
    LIMIT 1
  `

  if (existing.length === 0) {
    throw new Error(`Failed to create or retrieve session for day ${dayIndex}`)
  }

  return existing[0] as Session
}
