"use client"

import { useEffect, useRef, useState } from "react"
import { TimerCircle } from "@/components/timer-circle"
import {
  canReuseDirectoryHandle,
  loadAppState,
  persistDirectoryHandle,
  requestDirectoryAccess,
  restoreDirectoryHandle,
  saveAppState,
} from "@/lib/local-app-state"

type TimerStatus = "running" | "paused" | "completed"

interface TimerItem {
  id: number
  minutes: number
  status: TimerStatus
  revision: number
  elapsedSeconds: number
}

interface PersistedAppState {
  timers: TimerItem[]
  nextId: number
}

type StorageStatus = "checking" | "ready" | "needs-access" | "unsupported" | "error"

const DEFAULT_TIMERS: TimerItem[] = [{ id: 1, minutes: 40, status: "running", revision: 0, elapsedSeconds: 0 }]

function normalizePersistedState(value: PersistedAppState | null): PersistedAppState | null {
  if (!value || !Array.isArray(value.timers)) return null

  const timers = value.timers.filter(
    (timer) =>
      Number.isInteger(timer?.id) &&
      Number.isFinite(timer?.minutes) &&
      timer.minutes > 0 &&
      ["running", "paused", "completed"].includes(timer?.status),
  ).map((timer) => ({
    ...timer,
    revision: Number.isInteger(timer.revision) ? timer.revision : 0,
    elapsedSeconds: Number.isFinite(timer.elapsedSeconds) ? Math.max(0, timer.elapsedSeconds) : 0,
  }))
  if (timers.length === 0) return null

  return {
    timers,
    nextId: Math.max(Number.isInteger(value.nextId) ? value.nextId : 1, ...timers.map((timer) => timer.id + 1)),
  }
}

export default function Home() {
  const [timers, setTimers] = useState<TimerItem[]>(DEFAULT_TIMERS)
  const [minuteInput, setMinuteInput] = useState("")
  const [editingTimerId, setEditingTimerId] = useState<number | null>(null)
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("checking")
  const directoryHandle = useRef<FileSystemDirectoryHandle | null>(null)
  const restoredHandle = useRef<FileSystemDirectoryHandle | null>(null)
  const hasLoadedState = useRef(false)
  const nextId = useRef(2)

  const useDirectory = async (handle: FileSystemDirectoryHandle) => {
    directoryHandle.current = handle
    restoredHandle.current = handle
    await persistDirectoryHandle(handle)

    const persisted = normalizePersistedState(await loadAppState<PersistedAppState>(handle))
    if (persisted) {
      setTimers(persisted.timers)
      nextId.current = persisted.nextId
    }

    hasLoadedState.current = true
    setStorageStatus("ready")
  }

  useEffect(() => {
    let cancelled = false

    const restoreAccess = async () => {
      if (!window.showDirectoryPicker) {
        if (!cancelled) setStorageStatus("unsupported")
        return
      }

      const handle = await restoreDirectoryHandle()
      if (cancelled) return
      restoredHandle.current = handle ?? null

      if (!handle || !(await canReuseDirectoryHandle(handle))) {
        if (!cancelled) setStorageStatus("needs-access")
        return
      }

      await useDirectory(handle)
    }

    restoreAccess().catch(() => {
      if (!cancelled) setStorageStatus("error")
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedState.current || !directoryHandle.current) return
    void saveAppState(directoryHandle.current, { timers, nextId: nextId.current } satisfies PersistedAppState).catch(
      () => setStorageStatus("error"),
    )
  }, [storageStatus, timers])

  const grantDirectoryAccess = async () => {
    try {
      setStorageStatus("checking")
      const remembered = restoredHandle.current
      if (remembered && (await requestDirectoryAccess(remembered))) {
        await useDirectory(remembered)
        return
      }

      const handle = await window.showDirectoryPicker?.()
      if (handle) await useDirectory(handle)
      else setStorageStatus("needs-access")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStorageStatus("needs-access")
      } else {
        setStorageStatus("error")
      }
    }
  }

  useEffect(() => {
    if (storageStatus !== "ready") return
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
                      elapsedSeconds: 0,
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
              return [...items, { id, minutes, status: "running", revision: 0, elapsedSeconds: 0 }]
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
  }, [editingTimerId, storageStatus])

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
      {storageStatus !== "ready" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#c7c8ca] p-6">
          <div className="max-w-md rounded-2xl bg-white p-7 text-center shadow-xl">
            {storageStatus === "checking" ? (
              <p className="text-lg font-medium text-neutral-700">Verificando acceso a tus datos…</p>
            ) : storageStatus === "unsupported" ? (
              <p className="text-neutral-700">Este navegador no permite guardar datos en una carpeta local. Abrí la aplicación con Chrome o Edge.</p>
            ) : (
              <>
                <h1 className="text-xl font-bold text-neutral-900">Acceso a la carpeta local</h1>
                <p className="mt-3 text-neutral-600">
                  {storageStatus === "error"
                    ? "No se pudo acceder a la carpeta. Volvé a autorizarla para cargar y guardar tus datos."
                    : "Elegí o autorizá la carpeta donde se guardan tus datos."}
                </p>
                <button
                  type="button"
                  onClick={() => void grantDirectoryAccess()}
                  className="mt-6 rounded-xl bg-neutral-900 px-5 py-3 font-semibold text-white hover:bg-neutral-700"
                >
                  Autorizar carpeta
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex w-full flex-wrap content-start px-10 pt-10">
        {timers.map((timer) => (
          <TimerCircle
            key={`${timer.id}-${timer.revision}`}
            status={timer.status}
            timerMinutes={timer.minutes}
            initialElapsedSeconds={timer.elapsedSeconds}
            onComplete={() => completeTimer(timer.id)}
            onElapsedChange={(elapsedSeconds) =>
              setTimers((items) =>
                items.map((item) => (item.id === timer.id ? { ...item, elapsedSeconds } : item)),
              )
            }
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
