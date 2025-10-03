"use client"

import { useEffect, useState, useCallback } from "react"
import { BatteryCylinder } from "@/components/battery-cylinder"
import { TimerCircle } from "@/components/timer-circle"
import { GoalModal } from "@/components/goal-modal"

interface Session {
  day_index: number
  accumulated_minutes: number
  daily_goal_hours: number
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [goalInput, setGoalInput] = useState("")

  // Load dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode") === "true"
    setIsDark(savedDarkMode)
  }, [])

  // Fetch session data
  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/session")
      const data = await res.json()
      setSession(data)
    } catch (error) {
      console.error("[v0] Error fetching session:", error)
    }
  }

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
      setSession(data)
    } catch (error) {
      console.error("[v0] Error adding minutes:", error)
    }
  }

  const updateGoal = async (hours: number) => {
    if (!session) return

    try {
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
      setSession(data)
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

    // Second note
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

  const handleTimerComplete = () => {
    playAlarmSound()
    addSessionMinutes(30)
    setIsTimerActive(false)
  }

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      // Toggle dark mode
      if (e.key === "d" || e.key === "D") {
        setIsDark((prev) => {
          const newValue = !prev
          localStorage.setItem("darkMode", String(newValue))
          return newValue
        })
        return
      }

      // Start/pause timer
      if (e.key === " " || e.key === "Enter") {
        if (!isModalOpen) {
          e.preventDefault()
          setIsTimerActive((prev) => !prev)
        } else if (e.key === "Enter" && goalInput) {
          e.preventDefault()
          const hours = Number.parseInt(goalInput) || 1
          updateGoal(hours)
          setIsModalOpen(false)
          setGoalInput("")
        }
        return
      }

      // Number keys for goal modal
      if (e.key >= "0" && e.key <= "9") {
        if (!isModalOpen) {
          setIsModalOpen(true)
          setGoalInput(e.key)
        } else {
          setGoalInput((prev) => prev + e.key)
        }
        return
      }

      if (e.key === "Backspace" && isModalOpen) {
        e.preventDefault()
        setGoalInput((prev) => prev.slice(0, -1))
        return
      }

      // Escape to close modal
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false)
        setGoalInput("")
      }
    },
    [isModalOpen, goalInput],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [handleKeyPress])

  const progress = session ? Math.min(1, session.accumulated_minutes / (session.daily_goal_hours * 60)) : 0

  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="fixed top-6 left-6 z-10">
        <div className={`text-6xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{session?.day_index || 1}</div>
        <div className={`text-sm text-center mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>día</div>
      </div>

      {/* Main cylinder */}
      <div className="h-screen w-full">
        <BatteryCylinder progress={progress} isDark={isDark} />
      </div>

      {/* Timer overlay */}
      <TimerCircle isActive={isTimerActive} onComplete={handleTimerComplete} isDark={isDark} />

      {/* Goal modal */}
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
    </main>
  )
}
