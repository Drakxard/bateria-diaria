"use client"

import { useEffect, useRef, useState } from "react"
import { TimerCircle } from "@/components/timer-circle"

type TimerStatus = "running" | "paused" | "completed"

interface TimerItem {
  id: number
  minutes: number
  status: TimerStatus
  revision: number
}

export default function Home() {
  const [timers, setTimers] = useState<TimerItem[]>([
    { id: 1, minutes: 40, status: "running", revision: 0 },
  ])
  const [minuteInput, setMinuteInput] = useState("")
  const [editingTimerId, setEditingTimerId] = useState<number | null>(null)
  const nextId = useRef(2)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault()
        setMinuteInput((current) => `${current}${event.key}`.slice(0, 4))
        return
      }

      if (event.key === "Backspace") {
        event.preventDefault()
        setMinuteInput((current) => current.slice(0, -1))
        return
      }

      if (event.key === "Escape") {
        setMinuteInput("")
        setEditingTimerId(null)
        return
      }

      if (event.key === "Enter") {
        event.preventDefault()
        setMinuteInput((current) => {
          const minutes = Number.parseInt(current, 10)

          if (Number.isFinite(minutes) && minutes > 0) {
            if (editingTimerId !== null) {
              setTimers((items) =>
                items.map((item) =>
                  item.id === editingTimerId
                    ? {
                        ...item,
                        minutes,
                        status: "running",
                        revision: item.revision + 1,
                      }
                    : item.status === "running"
                      ? { ...item, status: "paused" }
                      : item,
                ),
              )
              setEditingTimerId(null)
              return ""
            }

            const id = nextId.current++
            setTimers((items) => {
              if (items.some((item) => item.status !== "completed")) return items
              return [...items, { id, minutes, status: "running", revision: 0 }]
            })
          }

          return ""
        })
        return
      }

      if (event.code === "Space" && !event.repeat) {
        event.preventDefault()
        setTimers((items) => {
          const activeIndex = items.findLastIndex((item) => item.status !== "completed")
          if (activeIndex === -1) return items

          return items.map((item, index) =>
            index === activeIndex
              ? { ...item, status: item.status === "running" ? "paused" : "running" }
              : item,
          )
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [editingTimerId])

  const completeTimer = (id: number) => {
    setTimers((items) =>
      items.map((item) => (item.id === id ? { ...item, status: "completed" } : item)),
    )

    try {
      const audioContext = new AudioContext()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.frequency.value = 620
      oscillator.type = "sine"
      gain.gain.setValueAtTime(0.08, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.35)
      oscillator.addEventListener("ended", () => void audioContext.close(), { once: true })
    } catch {
      // Algunos navegadores pueden bloquear audio sin interacción previa.
    }
  }

  return (
    <main className="min-h-screen bg-[#c7c8ca]">
      <div className="flex w-full flex-wrap content-start px-10 pt-10">
        {timers.map((timer) => (
          <TimerCircle
            key={`${timer.id}-${timer.revision}`}
            status={timer.status}
            timerMinutes={timer.minutes}
            onComplete={() => completeTimer(timer.id)}
            onClick={() => {
              setEditingTimerId(timer.id)
              setMinuteInput("")
            }}
          />
        ))}
      </div>

      {(minuteInput || editingTimerId !== null) && (
        <div
          aria-live="polite"
          className="fixed left-1/2 top-6 -translate-x-1/2 text-2xl font-bold tabular-nums text-green-600"
        >
          {minuteInput || "0"}
        </div>
      )}

    </main>
  )
}
