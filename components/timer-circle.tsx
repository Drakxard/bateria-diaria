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

  const remainingSeconds = Math.max(0, Math.ceil(totalSeconds - elapsedSeconds))
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation()
      onCancel()
    }
  }

  if (status === "idle" && elapsedSeconds === 0) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative h-full w-full">
        <div className="absolute left-4 right-4 top-4 bottom-4 md:left-6 md:right-6 md:top-6 md:bottom-6">
          <PastedImageStage
            imageUrl={imageUrl}
            imageTransform={imageTransform}
            isSelected={isImageSelected}
            isDark={isDark}
            onSelect={onImageSelect}
            onDeselect={onImageDeselect}
            onTransformChange={onImageTransformChange}
            remainingMinutes={timerMinutes}
            emptyTitle="Pega una imagen con Ctrl+V"
            emptySubtitle="La imagen se carga en este overlay. Tocala para ajustar."
            showFallbackBattery={false}
            variant="timer-overlay"
            className="pt-24 md:pt-6 md:pl-[240px]"
          />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTimerClick(e)
          }}
          className={`absolute left-6 top-6 z-20 min-w-[150px] rounded-[1.5rem] border px-5 py-4 text-left shadow-xl transition ${
            isDark ? "border-white/10 bg-gray-900/88 text-white" : "border-gray-200 bg-white/92 text-gray-900"
          }`}
        >
          <div className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Temporizador
          </div>
          <div className="mt-2 text-4xl font-bold">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </div>
          <div className={`mt-2 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Click para cambiar minutos</div>
        </button>
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white">
          {imageUrl ? "Ctrl+V reemplaza la imagen" : "Ctrl+V pega una imagen"}
        </div>
      </div>
    </div>
  )
}

