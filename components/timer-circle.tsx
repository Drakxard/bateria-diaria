"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { PastedImageStage } from "@/components/pasted-image-stage"
import type { ImageTransformState } from "@/lib/local-app-state"

type TimerStatus = "idle" | "running" | "paused"

interface TimerCircleProps {
  status: TimerStatus
  onComplete: (excessMinutes: number) => void
  isDark: boolean
  timerMinutes: number
  onTimerClick: (e: React.MouseEvent) => void
  onCancel: () => void
  speedMultiplier: number
  imageUrl: string | null
  imageTransform: ImageTransformState
  isImageSelected: boolean
  onImageSelect: () => void
  onImageDeselect: () => void
  onImageTransformChange: (transform: ImageTransformState) => void
}

export function TimerCircle({
  status,
  onComplete,
  isDark,
  timerMinutes,
  onTimerClick,
  onCancel,
  speedMultiplier,
  imageUrl,
  imageTransform,
  isImageSelected,
  onImageSelect,
  onImageDeselect,
  onImageTransformChange,
}: TimerCircleProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const elapsedRef = useRef(0)
  const notificationShownRef = useRef(false)
  const lastTickRef = useRef<number | null>(null)
  const tickRef = useRef<((force?: boolean) => void) | null>(null)

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

    tickRef.current = null
    lastTickRef.current = null

    if (status === "running") {
      notificationShownRef.current = false
      const effectiveSpeed = Math.max(1, speedMultiplier)
      lastTickRef.current = Date.now()

      const tick = (force = false) => {
        const now = Date.now()
        const lastTick = lastTickRef.current ?? now
        let deltaSeconds = ((now - lastTick) / 1000) * effectiveSpeed

        if (force && deltaSeconds < effectiveSpeed) {
          deltaSeconds = effectiveSpeed
        }

        lastTickRef.current = now

        const previousElapsed = elapsedRef.current
        const tentativeElapsed = previousElapsed + deltaSeconds
        const nextElapsed = Math.min(totalSeconds, tentativeElapsed)
        const overshootSeconds = Math.max(tentativeElapsed - totalSeconds, 0)

        if (nextElapsed !== previousElapsed) {
          elapsedRef.current = nextElapsed
          setElapsedSeconds(nextElapsed)
        }

        if (nextElapsed >= totalSeconds) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }

          tickRef.current = null
          lastTickRef.current = null

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

      tickRef.current = tick

      intervalRef.current = setInterval(() => tick(), 1000)

      if (elapsedRef.current === 0) {
        tick(true)
      } else {
        tick()
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        tickRef.current = null
        lastTickRef.current = null
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
      tickRef.current = null
      lastTickRef.current = null
    }
  }, [status, totalSeconds, onComplete, timerMinutes, speedMultiplier])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && tickRef.current) {
        tickRef.current()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

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

  const timerCircle = (
    <div
      className="relative"
      onClick={(e) => {
        e.stopPropagation()
        onTimerClick(e)
      }}
    >
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
  )

  if (status === "idle" && elapsedSeconds === 0) return null

  if (!imageUrl) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        {timerCircle}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="absolute left-6 top-6 z-20 md:left-8 md:top-8">{timerCircle}</div>

      <div className="absolute bottom-4 left-4 right-4 top-[244px] z-0 md:bottom-6 md:left-[244px] md:right-6 md:top-6">
        <PastedImageStage
          imageUrl={imageUrl}
          imageTransform={imageTransform}
          isSelected={isImageSelected}
          isDark={isDark}
          onSelect={onImageSelect}
          onDeselect={onImageDeselect}
          onTransformChange={onImageTransformChange}
          remainingMinutes={timerMinutes}
          showFallbackBattery={false}
          variant="timer-overlay"
        />
      </div>
    </div>
  )
}

