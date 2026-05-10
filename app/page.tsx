"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GoalModal } from "@/components/goal-modal"
import { TimerCircle } from "@/components/timer-circle"
import { TimerConfigModal } from "@/components/timer-config-modal"
import { ExcessTimeModal } from "@/components/excess-time-modal"
import { BatteryCylinder } from "@/components/battery-cylinder"
import { PastedImageStage } from "@/components/pasted-image-stage"
import {
  DEFAULT_IMAGE_TRANSFORM,
  DEFAULT_SESSION_STATE,
  canReuseDirectoryHandle,
  getTodayStamp,
  loadImageFromDirectory,
  loadSessionState,
  normalizeImageTransform,
  normalizeSessionState,
  persistDirectoryHandle,
  requestDirectoryAccess,
  restoreDirectoryHandle,
  saveImageToDirectory,
  saveImageTransform,
  saveSessionState,
  type ImageAssetState,
  type ImageTransformState,
  type LocalSessionState,
} from "@/lib/local-app-state"

const FAST_FORWARD_SECONDS = 3

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

function FolderGate({ isDark, fsSupported, isConnecting, onSelect }: { isDark: boolean; fsSupported: boolean; isConnecting: boolean; onSelect: () => void }) {
  return (
    <main className={`flex min-h-screen items-center justify-center px-6 py-10 ${isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-950"}`}>
      <div className={`w-full max-w-xl rounded-[2rem] border p-8 shadow-2xl ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
        <div className="space-y-4">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-500">Modo local</div>
          <h1 className="text-4xl font-bold">Conecta una carpeta antes de usar la app</h1>
          <p className={`text-base leading-7 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            La imagen pegada y su ajuste se guardaran en una carpeta local. Esta version funciona solo en navegadores Chromium con File System Access API.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <button
            type="button"
            onClick={onSelect}
            disabled={!fsSupported || isConnecting}
            className={`rounded-full px-6 py-4 text-lg font-semibold transition ${
              !fsSupported || isConnecting
                ? "cursor-not-allowed bg-gray-400 text-white"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }`}
          >
            {isConnecting ? "Conectando..." : "Elegir carpeta"}
          </button>

          {!fsSupported && (
            <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-700"}`}>
              Este navegador no soporta la API requerida. Usa Chrome o Edge actualizados.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function Home() {
  const [session, setSession] = useState<LocalSessionState>(DEFAULT_SESSION_STATE)
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">("idle")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [goalInput, setGoalInput] = useState("")
  const [isTimerConfigOpen, setIsTimerConfigOpen] = useState(false)
  const [timerInput, setTimerInput] = useState("")
  const [isExcessModalOpen, setIsExcessModalOpen] = useState(false)
  const [excessMinutes, setExcessMinutes] = useState(0)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [isFastForwarding, setIsFastForwarding] = useState(false)
  const [showSessionStacks, setShowSessionStacks] = useState(false)
  const [isImageSelected, setIsImageSelected] = useState(false)
  const [imageAsset, setImageAsset] = useState<ImageAssetState | null>(null)
  const [imageTransform, setImageTransform] = useState<ImageTransformState>(DEFAULT_IMAGE_TRANSFORM)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isConnectingDirectory, setIsConnectingDirectory] = useState(false)
  const [isFsSupported, setIsFsSupported] = useState(true)
  const imageUrlRef = useRef<string | null>(null)

  const isDark = session.darkMode

  const updateSession = useCallback((updater: (current: LocalSessionState) => LocalSessionState) => {
    setSession((current) => {
      const next = normalizeSessionState(updater(normalizeSessionState(current)))
      saveSessionState(next)
      return next
    })
  }, [])

  const replaceImageFile = useCallback((file: File, asset: ImageAssetState, transform: ImageTransformState) => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current)
    }

    const nextUrl = URL.createObjectURL(file)
    imageUrlRef.current = nextUrl
    setImageUrl(nextUrl)
    setImageAsset(asset)
    setImageTransform(normalizeImageTransform(transform))
  }, [])

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const initialState = loadSessionState()
      if (!cancelled) {
        setSession(initialState)
        setIsFsSupported(typeof window.showDirectoryPicker === "function")
      }

      if (typeof window.showDirectoryPicker !== "function") {
        if (!cancelled) {
          setIsHydrated(true)
        }
        return
      }

      const restoredHandle = await restoreDirectoryHandle()
      if (cancelled) {
        return
      }

      if (restoredHandle && (await canReuseDirectoryHandle(restoredHandle))) {
        setDirectoryHandle(restoredHandle)
        const loadedImage = await loadImageFromDirectory(restoredHandle)
        if (!cancelled && loadedImage) {
          replaceImageFile(loadedImage.file, loadedImage.asset, loadedImage.transform)
        }
      }

      if (!cancelled) {
        setIsHydrated(true)
      }
    }

    hydrate().catch(() => {
      if (!cancelled) {
        setIsHydrated(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [replaceImageFile])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    updateSession((current) => {
      if (current.lastActiveDate === getTodayStamp()) {
        return current
      }

      return {
        ...current,
        accumulatedMinutes: 0,
        lastActiveDate: getTodayStamp(),
      }
    })
  }, [isHydrated, updateSession])

  useEffect(() => {
    if (!directoryHandle || !imageAsset) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveImageTransform(directoryHandle, imageAsset, imageTransform).catch((error) => {
        console.error("[local] Failed to persist image transform:", error)
      })
    }, 150)

    return () => window.clearTimeout(timeoutId)
  }, [directoryHandle, imageAsset, imageTransform])

  const handleDirectorySelection = useCallback(async () => {
    if (typeof window.showDirectoryPicker !== "function") {
      setIsFsSupported(false)
      return
    }

    setIsConnectingDirectory(true)

    try {
      const handle = await window.showDirectoryPicker()
      const granted = await requestDirectoryAccess(handle)

      if (!granted) {
        return
      }

      await persistDirectoryHandle(handle)
      setDirectoryHandle(handle)

      const loadedImage = await loadImageFromDirectory(handle)
      if (loadedImage) {
        replaceImageFile(loadedImage.file, loadedImage.asset, loadedImage.transform)
      } else {
        setImageAsset(null)
        setImageTransform(DEFAULT_IMAGE_TRANSFORM)
        setImageUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current)
          }
          imageUrlRef.current = null
          return null
        })
      }
    } catch (error) {
      console.error("[local] Directory selection failed:", error)
    } finally {
      setIsConnectingDirectory(false)
      setIsHydrated(true)
    }
  }, [replaceImageFile])

  const goalHours = session.dailyGoalHours
  const goalMinutes = goalHours > 0 ? goalHours * 60 : 0
  const accumulatedMinutes = session.accumulatedMinutes
  const progress = goalMinutes > 0 ? Math.min(1, accumulatedMinutes / goalMinutes) : 0
  const remainingMinutes = goalMinutes > 0 ? Math.max(goalMinutes - accumulatedMinutes, 0) : 0

  const sessionStacks = useMemo(() => {
    if (accumulatedMinutes <= 0) {
      return [] as Array<{ id: string; progress: number; label: string }>
    }

    const interval = Math.max(1, session.timerMinutes)
    const fullStacks = Math.floor(accumulatedMinutes / interval)
    const remainder = accumulatedMinutes % interval
    const stacks: Array<{ id: string; progress: number; label: string }> = []

    for (let index = 0; index < fullStacks; index += 1) {
      stacks.push({
        id: `stack-${index}`,
        progress: 1,
        label: formatDuration(interval),
      })
    }

    if (remainder > 0) {
      stacks.push({
        id: `stack-${stacks.length}`,
        progress: remainder / interval,
        label: formatDuration(remainder),
      })
    }

    return stacks
  }, [accumulatedMinutes, session.timerMinutes])

  const addSessionMinutes = useCallback(
    (minutes: number) => {
      updateSession((current) => ({
        ...current,
        accumulatedMinutes: current.accumulatedMinutes + Math.max(0, minutes),
        lastActiveDate: getTodayStamp(),
      }))
    },
    [updateSession],
  )

  const updateGoal = useCallback(
    (hours: number) => {
      const additionalHours = Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : 0
      if (additionalHours === 0) {
        return
      }

      updateSession((current) => ({
        ...current,
        dailyGoalHours: current.dailyGoalHours + additionalHours,
      }))
    },
    [updateSession],
  )

  const playAlarmSound = () => {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 523.25
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
      osc2.frequency.value = 659.25
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
      addSessionMinutes(session.timerMinutes)
    }

    setSpeedMultiplier(1)
    setTimerStatus("idle")
  }

  const handleAcceptExcess = () => {
    addSessionMinutes(session.timerMinutes + excessMinutes)
    setIsExcessModalOpen(false)
    setExcessMinutes(0)
  }

  const handleRejectExcess = () => {
    addSessionMinutes(session.timerMinutes)
    setIsExcessModalOpen(false)
    setExcessMinutes(0)
  }

  const toggleDarkMode = useCallback(() => {
    updateSession((current) => ({
      ...current,
      darkMode: !current.darkMode,
    }))
  }, [updateSession])

  const handleTimerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSpeedMultiplier(1)
    setIsFastForwarding(false)
    setTimerStatus((prev) => (prev === "idle" ? "idle" : "paused"))
    setIsTimerConfigOpen(true)
    setTimerInput("")
  }

  const handleTimerConfigConfirm = (minutes: number) => {
    updateSession((current) => ({
      ...current,
      timerMinutes: Math.max(1, minutes),
    }))
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
      if (e.ctrlKey || e.metaKey) {
        return
      }

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
          const totalSeconds = Math.max(1, session.timerMinutes * 60)
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
          const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : session.timerMinutes
          handleTimerConfigConfirm(minutes)
        } else if (isModalOpen && goalInput) {
          e.preventDefault()
          const hours = Number.parseInt(goalInput, 10) || 1
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
        } else if (isImageSelected) {
          setIsImageSelected(false)
        } else if (showSessionStacks) {
          setShowSessionStacks(false)
        }
      }
    },
    [cancelTimer, goalInput, isImageSelected, isModalOpen, isTimerConfigOpen, session.timerMinutes, showSessionStacks, timerInput, timerStatus, toggleDarkMode, updateGoal],
  )

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      if (!directoryHandle || !event.clipboardData) {
        return
      }

      const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"))
      if (!imageItem) {
        return
      }

      const file = imageItem.getAsFile()
      if (!file) {
        return
      }

      event.preventDefault()

      const nextTransform = DEFAULT_IMAGE_TRANSFORM
      const asset = await saveImageToDirectory(directoryHandle, file, nextTransform)
      replaceImageFile(file, asset, nextTransform)
      setIsImageSelected(true)
    },
    [directoryHandle, replaceImageFile],
  )

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" && !isFastForwarding) {
        setSpeedMultiplier(1)
      }
    },
    [isFastForwarding],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("paste", handlePaste)

    return () => {
      window.removeEventListener("keydown", handleKeyPress)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("paste", handlePaste)
    }
  }, [handleKeyPress, handleKeyUp, handlePaste])

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

  const totalDurationLabel = formatDuration(accumulatedMinutes)
  const overlayBackground = isDark ? "bg-gray-900/95" : "bg-white/95"
  const overlayAccentText = isDark ? "text-white" : "text-gray-900"

  if (!isHydrated || !directoryHandle) {
    return (
      <FolderGate
        isDark={isDark}
        fsSupported={isFsSupported}
        isConnecting={isConnectingDirectory}
        onSelect={handleDirectorySelection}
      />
    )
  }

  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="grid min-h-screen grid-cols-1 gap-6 p-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 md:p-6">
        <section className="flex flex-col justify-between gap-6 md:sticky md:top-6 md:h-[calc(100vh-3rem)]">
          <div className={`rounded-[2rem] border p-5 shadow-xl ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500">Tiempo</div>
            <div className="mt-4 text-5xl font-bold">{formatDuration(remainingMinutes)}</div>
            <div className={`mt-3 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {formatDuration(accumulatedMinutes)} acumulado de {goalHours}h
            </div>
            <div className={`mt-6 h-2 overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className={`mt-3 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              `Ctrl+V` pega una imagen. `Click` la ajusta. `Espacio` controla el temporizador.
            </div>
          </div>

          <div className={`rounded-[2rem] border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
            <div className="text-sm font-semibold">Temporizador</div>
            <div className={`mt-2 text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{session.timerMinutes} min</div>
            <div className={`mt-3 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              `Enter` inicia. `ArrowDown` acelera mientras corre. Click en el circulo para cambiar minutos.
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <PastedImageStage
            imageUrl={imageUrl}
            imageTransform={imageTransform}
            isSelected={isImageSelected}
            isDark={isDark}
            onSelect={() => setIsImageSelected(true)}
            onDeselect={() => setIsImageSelected(false)}
            onTransformChange={(transform) => setImageTransform(normalizeImageTransform(transform))}
            remainingMinutes={remainingMinutes}
          />
        </section>
      </div>

      <TimerCircle
        status={timerStatus}
        onComplete={handleTimerComplete}
        isDark={isDark}
        timerMinutes={session.timerMinutes}
        onTimerClick={handleTimerClick}
        onCancel={cancelTimer}
        speedMultiplier={speedMultiplier}
      />

      {showSessionStacks && (
        <div className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 px-8 py-12 backdrop-blur-md ${overlayBackground}`}>
          {sessionStacks.length > 0 ? (
            <div className="flex w-full items-end justify-center gap-6 overflow-x-auto pb-4">
              {sessionStacks.map((stack, index) => (
                <div key={stack.id} className="flex items-end gap-4">
                  <div className="h-[400px] w-[200px]">
                    <BatteryCylinder
                      progress={stack.progress}
                      isDark={isDark}
                      remainingMinutes={0}
                      labelOverride={stack.label}
                      labelTopClass="top-[4%]"
                    />
                  </div>
                  {index < sessionStacks.length - 1 && (
                    <span className={`${overlayAccentText} self-center text-4xl font-semibold`}>+</span>
                  )}
                </div>
              ))}
              <span className={`${overlayAccentText} self-center text-4xl font-semibold`}>=</span>
              <div className="h-[400px] w-[200px]">
                <BatteryCylinder
                  progress={progress}
                  isDark={isDark}
                  remainingMinutes={remainingMinutes}
                  labelOverride={totalDurationLabel}
                  labelTopClass="top-[4%]"
                />
              </div>
            </div>
          ) : (
            <div className={`text-center font-semibold ${overlayAccentText}`}>Todavia no registras sesiones hoy.</div>
          )}
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
        fallbackMinutes={session.timerMinutes}
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
        timerMinutes={session.timerMinutes}
        onAccept={handleAcceptExcess}
        onReject={handleRejectExcess}
        isDark={isDark}
      />
    </main>
  )
}
