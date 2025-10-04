"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"

interface TimerCircleProps {
  isActive: boolean
  onComplete: (excessMinutes: number) => void
  isDark: boolean
  timerMinutes: number
  onTimerClick: (e: React.MouseEvent) => void
  onCancel: () => void
}

export function TimerCircle({ isActive, onComplete, isDark, timerMinutes, onTimerClick, onCancel }: TimerCircleProps) {
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const notificationShownRef = useRef(false)

  const totalSeconds = timerMinutes * 60

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (isActive && !startTime) {
      const now = Date.now()
      setStartTime(now)
      localStorage.setItem("timerStartTime", String(now))
      localStorage.setItem("timerDuration", String(timerMinutes))
      notificationShownRef.current = false
    } else if (!isActive) {
      setStartTime(null)
      setElapsedSeconds(0)
      localStorage.removeItem("timerStartTime")
      localStorage.removeItem("timerDuration")
      notificationShownRef.current = false
    }
  }, [isActive, timerMinutes])

  useEffect(() => {
    const savedStartTime = localStorage.getItem("timerStartTime")
    const savedDuration = localStorage.getItem("timerDuration")

    if (savedStartTime && savedDuration) {
      const start = Number.parseInt(savedStartTime)
      const duration = Number.parseInt(savedDuration)
      const elapsed = Math.floor((Date.now() - start) / 1000)

      if (elapsed < duration * 60) {
        setStartTime(start)
        setElapsedSeconds(elapsed)
      } else {
        const excess = elapsed - duration * 60
        localStorage.removeItem("timerStartTime")
        localStorage.removeItem("timerDuration")
        onComplete(Math.floor(excess / 60))
      }
    }
  }, [])

  useEffect(() => {
    if (!startTime) return

    const updateElapsed = () => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      setElapsedSeconds(elapsed)

      if (elapsed >= totalSeconds) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }

        if ("Notification" in window && Notification.permission === "granted" && !notificationShownRef.current) {
          new Notification("¡Sesión completada! 🎉", {
            body: `Has completado ${timerMinutes} minutos de trabajo`,
            icon: "/favicon.ico",
            tag: "timer-complete",
          })
          notificationShownRef.current = true
        }

        const excess = elapsed - totalSeconds
        onComplete(Math.floor(excess / 60))
      }
    }

    updateElapsed()
    intervalRef.current = setInterval(updateElapsed, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [startTime, totalSeconds, onComplete, timerMinutes])

  const progress = Math.min(100, (elapsedSeconds / totalSeconds) * 100)
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds)
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation()
      onCancel()
    }
  }

  const handleTimerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onTimerClick(e)
  }

  if (!isActive && !startTime && elapsedSeconds === 0) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative" onClick={handleTimerClick}>
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
