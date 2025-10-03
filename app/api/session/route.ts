import { getCurrentSession, updateSessionMinutes, updateDailyGoal, createNewDay } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getCurrentSession()
    return NextResponse.json(session)
  } catch (error) {
    console.error("[v0] Error fetching session:", error)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, dayIndex, minutes, hours } = body

    if (action === "addMinutes") {
      await updateSessionMinutes(dayIndex, minutes)
    } else if (action === "updateGoal") {
      await updateDailyGoal(dayIndex, hours)
    } else if (action === "newDay") {
      await createNewDay(dayIndex, hours || 1)
    }

    const session = await getCurrentSession()
    return NextResponse.json(session)
  } catch (error) {
    console.error("[v0] Error updating session:", error)
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}
