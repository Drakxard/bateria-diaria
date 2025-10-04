"use client"

import type React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { BatteryCylinder } from "@/components/battery-cylinder"
import { TimerCircle } from "@/components/timer-circle"
import { GoalModal } from "@/components/goal-modal"
import { TimerConfigModal } from "@/components/timer-config-modal"
import { ExcessTimeModal } from "@/components/excess-time-modal"

interface Session {
  day_index: number
  accumulated_minutes: number
  daily_goal_hours: number
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">("idle")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [goalInput, setGoalInput] = useState("")
  const [isTimerConfigOpen, setIsTimerConfigOpen] = useState(false)
  const [timerInput, setTimerInput] = useState("")
  const [timerMinutes, setTimerMinutes] = useState(30)
  const [isExcessModalOpen, setIsExcessModalOpen] = useState(false)
  const [excessMinutes, setExcessMinutes] = useState(0)
  const fetchRequestIdRef = useRef(0)

  const fetchSession = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current
    try {
      const res = await fetch("/api/session", { cache: "no-store" })
      if (!res.ok) {
        throw new Error(`Failed to fetch session: ${res.status}`)
      }
      const data = await res.json()
      if (fetchRequestIdRef.current === requestId) {
        console.log("[v0] Fetched session:", data)
        setSession(data)
      } else {
        console.log("[v0] Ignored stale session response:", { requestId, latestRequestId: fetchRequestIdRef.current })
      }
    } catch (error) {
      console.error("[v0] Error fetching session:", error)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode") === "true"
    setIsDark(savedDarkMode)
    const savedTimerMinutes = localStorage.getItem("timerMinutes")
    if (savedTimerMinutes) {
      setTimerMinutes(Number.parseInt(savedTimerMinutes))
    }
  }, [])

  const addSessionMinutes = async (minutes: number) => {
    if (!session) return

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addMinutes",
          dayIndex: session.day_index,
          minutes,
        }),
      })
      const data = await res.json()
      console.log("[v0] Added minutes, new session:", data)
      fetchRequestIdRef.current += 1
      setSession(data)
    } catch (error) {
      console.error("[v0] Error adding minutes:", error)
    }
  }

  const updateGoal = async (hours: number) => {
    if (!session) return

    try {
      console.log("[v0] Updating goal to:", hours, "hours")
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateGoal",
          dayIndex: session.day_index,
          hours,
        }),
      })
      const data = await res.json()
      console.log("[v0] Goal updated, new session:", data)
      fetchRequestIdRef.current += 1
      setSession(data)
      await fetchSession() // Force re-fetch to ensure UI updates with new goal
    } catch (error) {
      console.error("[v0] Error updating goal:", error)
    }
  }

  const playAlarmSound = () => {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 523.25 // C5
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)

    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.connect(gain2)
      gain2.connect(audioContext.destination)
      osc2.frequency.value = 659.25 // E5
      osc2.type = "sine"
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      osc2.start(audioContext.currentTime)
      osc2.stop(audioContext.currentTime + 0.5)
    }, 200)
  }

  const handleTimerComplete = (excess: number) => {
    playAlarmSound()

    if (excess > 0) {
      setExcessMinutes(excess)
      setIsExcessModalOpen(true)
    } else {
      addSessionMinutes(timerMinutes)
    }

    setTimerStatus("idle")
  }

  const handleAcceptExcess = () => {
    addSessionMinutes(timerMinutes + excessMinutes)
    setIsExcessModalOpen(false)
    setExcessMinutes(0)
  }

  const handleRejectExcess = () => {
    addSessionMinutes(timerMinutes)
    setIsExcessModalOpen(false)
    setExcessMinutes(0)
  }

  const toggleDarkMode = useCallback(() => {
    setIsDark((prev) => {
      const newValue = !prev
      localStorage.setItem("darkMode", String(newValue))
      return newValue
    })
  }, [])

  const handleTimerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTimerStatus((prev) => (prev === "idle" ? "idle" : "paused"))
    setIsTimerConfigOpen(true)
    setTimerInput("")
  }

  const handleTimerConfigConfirm = (minutes: number) => {
    setTimerMinutes(minutes)
    localStorage.setItem("timerMinutes", String(minutes))
    setTimerStatus("idle")
    setIsTimerConfigOpen(false)
    setTimerInput("")
  }

  const cancelTimer = useCallback(() => {
    setTimerStatus("idle")
  }, [])

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") {
        toggleDarkMode()
        return
      }

      if (e.key === " ") {
        if (!isModalOpen && !isTimerConfigOpen) {
          e.preventDefault()
          setTimerStatus((prev) => (prev === "running" ? "paused" : "running"))
        }
        return
      }

      if (e.key === "Enter") {
        if (isTimerConfigOpen) {
          e.preventDefault()
          const parsed = timerInput ? Number.parseInt(timerInput, 10) : Number.NaN
          const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : timerMinutes
          handleTimerConfigConfirm(minutes)
        } else if (isModalOpen && goalInput) {
          e.preventDefault()
          const hours = Number.parseInt(goalInput) || 1
          updateGoal(hours)
          setIsModalOpen(false)
          setGoalInput("")
        } else if (!isModalOpen) {
          e.preventDefault()
          setTimerStatus("running")
        }
        return
      }

      if (e.key >= "0" && e.key <= "9") {
        if (isTimerConfigOpen) {
          setTimerInput((prev) => prev + e.key)
        } else if (!isModalOpen) {
          setIsModalOpen(true)
          setGoalInput(e.key)
        } else {
          setGoalInput((prev) => prev + e.key)
        }
        return
      }

      if (e.key === "Backspace") {
        if (isTimerConfigOpen) {
          e.preventDefault()
          setTimerInput((prev) => prev.slice(0, -1))
        } else if (isModalOpen) {
          e.preventDefault()
          setGoalInput((prev) => prev.slice(0, -1))
        }
        return
      }

      if (e.key === "Escape") {
        if (timerStatus !== "idle") {
          cancelTimer()
        } else if (isTimerConfigOpen) {
          setIsTimerConfigOpen(false)
          setTimerInput("")
        } else if (isModalOpen) {
          setIsModalOpen(false)
          setGoalInput("")
        }
      }
    },
    [isModalOpen, isTimerConfigOpen, goalInput, timerInput, timerStatus, timerMinutes, cancelTimer, toggleDarkMode],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [handleKeyPress])

  const goalHours = session ? session.daily_goal_hours : 0
  const goalMinutes = goalHours > 0 ? goalHours * 60 : 0
  const progress = session && goalMinutes > 0 ? Math.min(1, session.accumulated_minutes / goalMinutes) : 0
  const accumulatedHours = session ? Math.floor(session.accumulated_minutes / 60) : 0
  const remainingMinutes = goalMinutes > 0 ? Math.max(goalMinutes - (session?.accumulated_minutes ?? 0), 0) : 0

  console.log("[v0] Render - session:", session, "accumulatedHours:", accumulatedHours, "progress:", progress)

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
    >
      <div
        className="fixed top-6 left-6 z-10 select-none"
      >
        <div className={`text-6xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{session?.day_index || 1}</div>
        <div className={`text-sm text-center mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>día</div>
      </div>

      <div className="h-screen w-full">
        <BatteryCylinder progress={progress} isDark={isDark} remainingMinutes={remainingMinutes} />
      </div>

      <TimerCircle
        status={timerStatus}
        onComplete={handleTimerComplete}
        isDark={isDark}
        timerMinutes={timerMinutes}
        onTimerClick={handleTimerClick}
        onCancel={cancelTimer}
      />

      <GoalModal
        isOpen={isModalOpen}
        currentInput={goalInput}
        onConfirm={(hours) => {
          updateGoal(hours)
          setIsModalOpen(false)
          setGoalInput("")
        }}
        onClose={() => {
          setIsModalOpen(false)
          setGoalInput("")
        }}
        isDark={isDark}
      />

      <TimerConfigModal
        isOpen={isTimerConfigOpen}
        currentInput={timerInput}
        fallbackMinutes={timerMinutes}
        onConfirm={handleTimerConfigConfirm}
        onClose={() => {
          setIsTimerConfigOpen(false)
          setTimerInput("")
        }}
        isDark={isDark}
      />

      <ExcessTimeModal
        isOpen={isExcessModalOpen}
        excessMinutes={excessMinutes}
        timerMinutes={timerMinutes}
        onAccept={handleAcceptExcess}
        onReject={handleRejectExcess}
        isDark={isDark}
      />
    </main>
  )
}
