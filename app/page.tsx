"use client"

import type React from "react"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { BatteryCylinder } from "@/components/battery-cylinder"
import { TimerCircle } from "@/components/timer-circle"
import { GoalModal } from "@/components/goal-modal"
import { TimerConfigModal } from "@/components/timer-config-modal"
import { ExcessTimeModal } from "@/components/excess-time-modal"

interface Session {
  day_index: number
  accumulated_minutes: number
  daily_goal_hours: number
  created_at?: string
  updated_at?: string
}

const formatDuration = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60

  if (hours > 0) {
    if (mins === 0) {
      return `${hours}h`
    }
    return `${hours}h:${mins.toString().padStart(2, "0")}min`
  }

  return `${mins}min`
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
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [isFastForwarding, setIsFastForwarding] = useState(false)
  const [showSessionStacks, setShowSessionStacks] = useState(false)
  const FAST_FORWARD_SECONDS = 3
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

    const previousSession = session
    const optimisticSession: Session = {
      ...session,
      accumulated_minutes: Number(session.accumulated_minutes) + minutes,
      updated_at: new Date().toISOString(),
    }

    fetchRequestIdRef.current += 1
    setSession(optimisticSession)

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

      if (!res.ok) {
        throw new Error(`Failed to add minutes: ${res.status}`)
      }

      const data = await res.json()
      console.log("[v0] Added minutes, new session:", data)
      setSession(data)
      await fetchSession().catch((refetchError) => {
        console.error("[v0] Error refetching session after add:", refetchError)
      })
    } catch (error) {
      console.error("[v0] Error adding minutes:", error)
      setSession(previousSession)
    }
  }

  const updateGoal = async (hours: number) => {
    if (!session) return

    const parsedHours = Number.isFinite(hours) ? Math.floor(hours) : 0
    const additionalHours = parsedHours > 0 ? parsedHours : 0

    if (additionalHours === 0) {
      return
    }

    const previousSession = session
    const optimisticSession: Session = {
      ...session,
      daily_goal_hours: Number(session.daily_goal_hours) + additionalHours,
      updated_at: new Date().toISOString(),
    }

    fetchRequestIdRef.current += 1
    setSession(optimisticSession)

    try {
      console.log("[v0] Adding goal hours:", additionalHours)
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateGoal",
          dayIndex: session.day_index,
          hours: additionalHours,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to update goal: ${res.status}`)
      }

      const data = await res.json()
      console.log("[v0] Goal updated, new session:", data)
      setSession(data)
      await fetchSession().catch((refetchError) => {
        console.error("[v0] Error refetching session after goal update:", refetchError)
      })
    } catch (error) {
      console.error("[v0] Error updating goal:", error)
      setSession(previousSession)
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
    setIsFastForwarding(false)

    if (excess > 0) {
      setExcessMinutes(excess)
      setIsExcessModalOpen(true)
    } else {
      addSessionMinutes(timerMinutes)
    }

    setSpeedMultiplier(1)
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
    setSpeedMultiplier(1)
    setIsFastForwarding(false)
    setTimerStatus((prev) => (prev === "idle" ? "idle" : "paused"))
    setIsTimerConfigOpen(true)
    setTimerInput("")
  }

  const handleTimerConfigConfirm = (minutes: number) => {
    setTimerMinutes(minutes)
    localStorage.setItem("timerMinutes", String(minutes))
    setSpeedMultiplier(1)
    setIsFastForwarding(false)
    setTimerStatus("idle")
    setIsTimerConfigOpen(false)
    setTimerInput("")
  }

  const cancelTimer = useCallback(() => {
    setSpeedMultiplier(1)
    setIsFastForwarding(false)
    setTimerStatus("idle")
  }, [])

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") {
        toggleDarkMode()
        return
      }

      if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        setShowSessionStacks((prev) => !prev)
        return
      }

      if (e.key === "ArrowDown") {
        if (timerStatus === "running") {
          e.preventDefault()
          const totalSeconds = Math.max(1, timerMinutes * 60)
          const fastMultiplier = Math.max(1, Math.ceil(totalSeconds / FAST_FORWARD_SECONDS))
          setSpeedMultiplier(fastMultiplier)
          setIsFastForwarding(true)
        }
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
        } else if (showSessionStacks) {
          setShowSessionStacks(false)
        }
      }
    },
    [isModalOpen, isTimerConfigOpen, goalInput, timerInput, timerStatus, timerMinutes, cancelTimer, toggleDarkMode, setSpeedMultiplier, setIsFastForwarding, showSessionStacks],
  )

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowDown" && !isFastForwarding) {
      setSpeedMultiplier(1)
    }
  }, [isFastForwarding])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [handleKeyPress])

  useEffect(() => {
    window.addEventListener("keyup", handleKeyUp)
    return () => window.removeEventListener("keyup", handleKeyUp)
  }, [handleKeyUp])

  useEffect(() => {
    if (timerStatus !== "running" && speedMultiplier !== 1) {
      setSpeedMultiplier(1)
    }
  }, [timerStatus, speedMultiplier])

  useEffect(() => {
    if (timerStatus !== "running" && isFastForwarding) {
      setIsFastForwarding(false)
    }
  }, [timerStatus, isFastForwarding])

  const goalHours = session ? Number(session.daily_goal_hours) : 0
  const goalMinutes = goalHours > 0 ? goalHours * 60 : 0
  const accumulatedMinutes = session ? Number(session.accumulated_minutes) : 0
  const progress = goalMinutes > 0 ? Math.min(1, accumulatedMinutes / goalMinutes) : 0
  const accumulatedHours = Math.floor(accumulatedMinutes / 60)
  const remainingMinutes = goalMinutes > 0 ? Math.max(goalMinutes - accumulatedMinutes, 0) : 0

  const sessionStacks = useMemo(() => {
    if (accumulatedMinutes <= 0) {
      return [] as Array<{ id: string; progress: number; label: string; title: string; minutes: number }>
    }

    const interval = Math.max(1, timerMinutes)
    const totalMinutes = Math.max(0, accumulatedMinutes)
    const fullStacks = Math.floor(totalMinutes / interval)
    const remainder = totalMinutes % interval
    const stacks: Array<{ id: string; progress: number; label: string; title: string; minutes: number }> = []

    for (let index = 0; index < fullStacks; index += 1) {
      stacks.push({
        id: `stack-${index}`,
        progress: 1,
        label: formatDuration(interval),
        title: `A${index + 1}`,
        minutes: interval,
      })
    }

    if (remainder > 0) {
      stacks.push({
        id: `stack-${stacks.length}`,
        progress: remainder / interval,
        label: formatDuration(remainder),
        title: `A${stacks.length + 1}`,
        minutes: remainder,
      })
    }

    return stacks
  }, [accumulatedMinutes, timerMinutes])

  const sessionEquation = useMemo(() => {
    if (sessionStacks.length === 0) {
      return ""
    }

    return `${sessionStacks.map((stack) => stack.title).join(" + ")} = Ctotal`
  }, [sessionStacks])

  const totalDurationLabel = formatDuration(accumulatedMinutes)
  const totalBatteryTitle = "Ctotal"


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
        speedMultiplier={speedMultiplier}
      />

      {showSessionStacks && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 bg-gray-900/95 px-8 py-12 backdrop-blur-md">
          {sessionStacks.length > 0 ? (
            <>
              <div className="text-center text-white text-xl font-semibold">{sessionEquation}</div>
              <div className="flex w-full items-end justify-center gap-6 overflow-x-auto pb-4">
                {sessionStacks.map((stack, index) => (
                  <div key={stack.id} className="flex items-end gap-4">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-[400px] w-[200px]">
                        <BatteryCylinder
                          progress={stack.progress}
                          isDark={true}
                          remainingMinutes={0}
                          labelOverride={stack.label}
                        />
                      </div>
                      <span className="text-white font-medium">{stack.title}</span>
                    </div>
                    {index < sessionStacks.length - 1 && (
                      <span className="text-white text-4xl font-semibold self-center">+</span>
                    )}
                  </div>
                ))}
                <span className="text-white text-4xl font-semibold self-center">=</span>
                <div className="flex flex-col items-center gap-3">
                  <div className="h-[400px] w-[200px]">
                    <BatteryCylinder
                      progress={progress}
                      isDark={true}
                      remainingMinutes={remainingMinutes}
                      labelOverride={totalDurationLabel}
                    />
                  </div>
                  <span className="text-white font-semibold">{totalBatteryTitle}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-white font-semibold">Todavia no registras sesiones hoy.</div>
          )}
          <p className="text-sm text-white/80">Presiona otra vez "c" o usa Escape para cerrar.</p>
        </div>
      )}

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
        currentGoalHours={goalHours}
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
