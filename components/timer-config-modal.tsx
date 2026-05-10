"use client"

import { PastedImageStage } from "@/components/pasted-image-stage"
import type { ImageTransformState } from "@/lib/local-app-state"

interface TimerConfigModalProps {
  isOpen: boolean
  currentInput: string
  onConfirm: (minutes: number) => void
  onClose: () => void
  isDark: boolean
  fallbackMinutes: number
  imageUrl: string | null
  imageTransform: ImageTransformState
  isImageSelected: boolean
  onImageSelect: () => void
  onImageDeselect: () => void
  onImageTransformChange: (transform: ImageTransformState) => void
}

export function TimerConfigModal({
  isOpen,
  currentInput,
  onConfirm,
  onClose,
  isDark,
  fallbackMinutes,
  imageUrl,
  imageTransform,
  isImageSelected,
  onImageSelect,
  onImageDeselect,
  onImageTransformChange,
}: TimerConfigModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    const parsed = currentInput ? Number.parseInt(currentInput, 10) : Number.NaN
    const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMinutes
    onConfirm(minutes)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md">
      <div
        className={`flex h-full w-full flex-col ${isDark ? "bg-gray-900/98 text-white" : "bg-white/98 text-gray-900"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4 px-4 pb-4 pt-5 md:px-8 md:pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Temporizador</h2>
              <div className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Ajusta minutos y pega una imagen con Ctrl+V. La imagen se ve sola; al tocarla aparece el marco.
              </div>
            </div>

            <div className={`min-w-[220px] rounded-[1.75rem] border px-5 py-4 ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
              <div className={`text-xs font-semibold uppercase tracking-[0.24em] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Minutos
              </div>
              <div className="mt-3 text-5xl font-bold text-green-500 md:text-6xl">{currentInput || String(fallbackMinutes)}</div>
              <div className={`mt-3 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Ingresa los minutos y presiona Enter</div>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <PastedImageStage
              imageUrl={imageUrl}
              imageTransform={imageTransform}
              isSelected={isImageSelected}
              isDark={isDark}
              onSelect={onImageSelect}
              onDeselect={onImageDeselect}
              onTransformChange={onImageTransformChange}
              remainingMinutes={fallbackMinutes}
              emptyTitle="Pega una imagen con Ctrl+V"
              emptySubtitle="La imagen se guarda en la carpeta elegida y solo muestra el marco al tocarla."
              showFallbackBattery={false}
            />
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <button
              onClick={onClose}
              className={`rounded-full px-6 py-3 font-semibold transition-colors ${
                isDark ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="rounded-full bg-green-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-600"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
