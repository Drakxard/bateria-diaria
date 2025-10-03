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
    // Create first session
    const newSession = await sql`
      INSERT INTO sessions (day_index, accumulated_minutes, daily_goal_hours)
      VALUES (1, 0, 1)
      RETURNING *
    `
    return newSession[0] as Session
  }

  return result[0] as Session
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

export async function createNewDay(dayIndex: number, goalHours = 1) {
  await sql`
    INSERT INTO sessions (day_index, accumulated_minutes, daily_goal_hours)
    VALUES (${dayIndex}, 0, ${goalHours})
    ON CONFLICT (day_index) DO NOTHING
  `
}
