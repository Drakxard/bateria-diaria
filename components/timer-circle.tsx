"use client"

import { useEffect, useRef, useState } from "react"

type TimerStatus = "running" | "paused" | "completed"

interface TimerCircleProps {
  status: TimerStatus
  timerMinutes: number
  onComplete: () => void
  onClick: () => void
}

export function TimerCircle({ status, timerMinutes, onComplete, onClick }: TimerCircleProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const elapsedRef = useRef(0)
  const lastTickRef = useRef<number | null>(null)
  const totalSeconds = Math.max(1, timerMinutes * 60)

  useEffect(() => {
    elapsedRef.current = elapsedSeconds
  }, [elapsedSeconds])

  useEffect(() => {
    if (status !== "running") {
      lastTickRef.current = null
      return
    }

    lastTickRef.current = Date.now()
    const tick = () => {
      const now = Date.now()
      const lastTick = lastTickRef.current ?? now
      const nextElapsed = Math.min(totalSeconds, elapsedRef.current + (now - lastTick) / 1000)

      lastTickRef.current = now
      elapsedRef.current = nextElapsed
      setElapsedSeconds(nextElapsed)

      if (nextElapsed >= totalSeconds) onComplete()
    }

    const intervalId = window.setInterval(tick, 250)
    return () => window.clearInterval(intervalId)
  }, [onComplete, status, totalSeconds])

  const completed = status === "completed"
  const progress = completed ? 100 : Math.min(100, (elapsedSeconds / totalSeconds) * 100)
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (progress / 100) * circumference
  const displaySeconds = completed
    ? totalSeconds
    : Math.max(0, Math.ceil(totalSeconds - elapsedSeconds))
  const minutes = Math.floor(displaySeconds / 60)
  const seconds = displaySeconds % 60

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Editar temporizador de ${timerMinutes} minutos`}
      className={`relative h-[200px] w-[200px] cursor-pointer transition-opacity hover:opacity-80 ${completed ? "opacity-55" : ""}`}
    >
      <svg width="200" height="200" className="-rotate-90">
        <circle cx="100" cy="100" r="45" stroke="#e5e7eb" strokeWidth="8" fill="none" />
        <circle
          cx="100"
          cy="100"
          r="45"
          stroke={completed ? "#16a34a" : "#22c55e"}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-bold text-gray-900">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>

      {completed && (
        <span className="absolute left-1/2 top-[148px] -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-800">
          Completado
        </span>
      )}
    </button>
  )
}
