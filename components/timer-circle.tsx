"use client"

import { useEffect, useState } from "react"

interface TimerCircleProps {
  isActive: boolean
  onComplete: () => void
  isDark: boolean
}

export function TimerCircle({ isActive, onComplete, isDark }: TimerCircleProps) {
  const [seconds, setSeconds] = useState(0)
  const totalSeconds = 30 * 60 // 30 minutes

  useEffect(() => {
    if (!isActive) {
      setSeconds(0)
      return
    }

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev >= totalSeconds) {
          clearInterval(interval)
          onComplete()
          return 0
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, onComplete, totalSeconds])

  const progress = (seconds / totalSeconds) * 100
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (!isActive && seconds === 0) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm">
      <div className="relative">
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
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            {minutes}:{remainingSeconds.toString().padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  )
}
