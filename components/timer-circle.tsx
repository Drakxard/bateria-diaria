"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"

type TimerStatus = "idle" | "running" | "paused"

interface TimerCircleProps {
  status: TimerStatus
  onComplete: (excessMinutes: number) => void
  isDark: boolean
  timerMinutes: number
  onTimerClick: (e: React.MouseEvent) => void
  onCancel: () => void
  speedMultiplier: number
}

export function TimerCircle({ status, onComplete, isDark, timerMinutes, onTimerClick, onCancel, speedMultiplier }: TimerCircleProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const elapsedRef = useRef(0)
  const notificationShownRef = useRef(false)

  const totalSeconds = Math.max(1, timerMinutes * 60)

  useEffect(() => {
    elapsedRef.current = elapsedSeconds
  }, [elapsedSeconds])

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (status === "running") {
      notificationShownRef.current = false

      const tick = () => {
        const increment = Math.max(1, speedMultiplier)
        const tentativeElapsed = elapsedRef.current + increment
        const nextElapsed = Math.min(totalSeconds, tentativeElapsed)
        const overshootSeconds = Math.max(tentativeElapsed - totalSeconds, 0)

        elapsedRef.current = nextElapsed
        setElapsedSeconds(nextElapsed)

        if (nextElapsed >= totalSeconds) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }

          if ("Notification" in window && Notification.permission === "granted" && !notificationShownRef.current) {
            new Notification("Sesion completada", {
              body: `Has completado ${timerMinutes} minutos de trabajo`,
              icon: "/favicon.ico",
              tag: "timer-complete",
            })
            notificationShownRef.current = true
          }

          const excessMinutes = overshootSeconds > 0 ? Math.floor(overshootSeconds / 60) : 0
          onComplete(excessMinutes)
        }
      }

      intervalRef.current = setInterval(tick, 1000)

      if (elapsedRef.current === 0) {
        tick()
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    if (status === "idle") {
      setElapsedSeconds(0)
      elapsedRef.current = 0
      notificationShownRef.current = false
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [status, totalSeconds, onComplete, timerMinutes, speedMultiplier])

  const progress = Math.min(100, (elapsedSeconds / totalSeconds) * 100)
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const remainingSeconds = Math.max(0, Math.ceil(totalSeconds - elapsedSeconds))
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation()
      onCancel()
    }
  }

  const handleInnerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onTimerClick(e)
  }

  if (status === "idle" && elapsedSeconds === 0) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative" onClick={handleInnerClick}>
        <svg width="200" height="200" className="transform -rotate-90">
          <circle cx="100" cy="100" r="45" stroke={isDark ? "#374151" : "#e5e7eb"} strokeWidth="8" fill="none" />
          <circle
            cx="100"
            cy="100"
            r="45"
            stroke="#22c55e"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  )
}

