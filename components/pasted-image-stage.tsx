"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import type { ImageTransformState } from "@/lib/local-app-state"
import { BatteryCylinder } from "@/components/battery-cylinder"

interface PastedImageStageProps {
  imageUrl: string | null
  imageTransform: ImageTransformState
  isSelected: boolean
  isDark: boolean
  onSelect: () => void
  onDeselect: () => void
  onTransformChange: (transform: ImageTransformState) => void
  remainingMinutes: number
  emptyTitle?: string
  emptySubtitle?: string
  showFallbackBattery?: boolean
  variant?: "default" | "timer-overlay"
  className?: string
}

const SCALE_STEP = 0.05

export function PastedImageStage({
  imageUrl,
  imageTransform,
  isSelected,
  isDark,
  onSelect,
  onDeselect,
  onTransformChange,
  remainingMinutes,
  emptyTitle = "Pega una imagen con Ctrl+V",
  emptySubtitle = "Se guardara en la carpeta elegida y podras ajustarla con click.",
  showFallbackBattery = true,
  variant = "default",
  className = "",
}: PastedImageStageProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragOriginRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const isTimerOverlay = variant === "timer-overlay"

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragOriginRef.current) {
        return
      }

      const deltaX = event.clientX - dragOriginRef.current.x
      const deltaY = event.clientY - dragOriginRef.current.y

      onTransformChange({
        ...imageTransform,
        offsetX: dragOriginRef.current.offsetX + deltaX,
        offsetY: dragOriginRef.current.offsetY + deltaY,
      })
    }

    const handlePointerUp = () => {
      dragOriginRef.current = null
      setIsDragging(false)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [imageTransform, onTransformChange])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageUrl) {
      return
    }

    event.stopPropagation()

    if (!isSelected) {
      onSelect()
      return
    }

    dragOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: imageTransform.offsetX,
      offsetY: imageTransform.offsetY,
    }
    setIsDragging(true)
  }

  const updateScale = (delta: number) => {
    onTransformChange({
      ...imageTransform,
      scale: Math.min(1.75, Math.max(0.85, imageTransform.scale + delta)),
    })
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!imageUrl || !isSelected) {
      return
    }

    event.preventDefault()
    updateScale(event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP)
  }

  return (
    <div
      className={`relative overflow-hidden transition-colors ${
        isTimerOverlay
          ? "h-full w-full"
          : `min-h-[55vh] rounded-[2rem] border md:min-h-[calc(100vh-3rem)] ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white/70"}`
      } ${className}`}
      onClick={onDeselect}
    >
      {imageUrl ? (
        <>
          <div
            className={`absolute inset-0 flex items-center justify-center transition ${
              isSelected ? "cursor-grab" : "cursor-pointer"
            } ${isDragging ? "cursor-grabbing" : ""}`}
            onClick={(event) => {
              event.stopPropagation()
              onSelect()
            }}
            onPointerDown={handlePointerDown}
            onWheel={handleWheel}
          >
            <img
              src={imageUrl}
              alt="Referencia pegada"
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
              style={{
                transform: `translate(${imageTransform.offsetX}px, ${imageTransform.offsetY}px) scale(${imageTransform.scale})`,
                transformOrigin: "center center",
              }}
            />
          </div>

          {isSelected && (
            <div className={`pointer-events-none absolute ${isTimerOverlay ? "inset-6" : "inset-5"} rounded-[1.5rem] border-2 border-dashed border-emerald-400/90 ${isTimerOverlay ? "" : "shadow-[0_0_0_9999px_rgba(0,0,0,0.12)]"}`}>
              {isTimerOverlay ? (
                <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/35 p-1 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      updateScale(-SCALE_STEP)
                    }}
                    className={`h-9 w-9 rounded-full text-lg font-semibold leading-none ${
                      isDark ? "bg-gray-900/90 text-white" : "bg-white/95 text-gray-900"
                    }`}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      updateScale(SCALE_STEP)
                    }}
                    className={`h-9 w-9 rounded-full text-lg font-semibold leading-none ${
                      isDark ? "bg-gray-900/90 text-white" : "bg-white/95 text-gray-900"
                    }`}
                  >
                    +
                  </button>
                </div>
              ) : (
                <>
                  <div className="pointer-events-auto absolute right-4 top-4 flex gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        updateScale(-SCALE_STEP)
                      }}
                      className={`rounded-full px-3 py-2 text-sm font-semibold ${
                        isDark ? "bg-gray-900/85 text-white" : "bg-white/90 text-gray-900"
                      }`}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onTransformChange({ scale: 1, offsetX: 0, offsetY: 0 })
                      }}
                      className={`rounded-full px-3 py-2 text-sm font-semibold ${
                        isDark ? "bg-gray-900/85 text-white" : "bg-white/90 text-gray-900"
                      }`}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        updateScale(SCALE_STEP)
                      }}
                      className={`rounded-full px-3 py-2 text-sm font-semibold ${
                        isDark ? "bg-gray-900/85 text-white" : "bg-white/90 text-gray-900"
                      }`}
                    >
                      +
                    </button>
                  </div>
                  <div
                    className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium ${
                      isDark ? "bg-gray-900/85 text-gray-100" : "bg-white/90 text-gray-700"
                    }`}
                  >
                    Arrastra para mover. Rueda o botones para escala.
                  </div>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
          {showFallbackBattery && (
            <div className="h-[360px] w-[180px] max-w-full">
              <BatteryCylinder progress={0} isDark={isDark} remainingMinutes={remainingMinutes} labelTopClass="top-[6%]" />
            </div>
          )}
          <div className={isDark ? "text-gray-200" : "text-gray-700"}>
            <div className="text-2xl font-semibold">{emptyTitle}</div>
            <div className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {emptySubtitle}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
