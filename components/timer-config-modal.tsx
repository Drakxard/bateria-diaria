"use client"

interface TimerConfigModalProps {
  isOpen: boolean
  currentInput: string
  onConfirm: (minutes: number) => void
  onClose: () => void
  isDark: boolean
  fallbackMinutes: number
}

export function TimerConfigModal({
  isOpen,
  currentInput,
  onConfirm,
  onClose,
  isDark,
  fallbackMinutes,
}: TimerConfigModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    const parsed = currentInput ? Number.parseInt(currentInput, 10) : Number.NaN
    const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMinutes
    onConfirm(minutes)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/50 backdrop-blur-sm">
      <div
        className={`p-8 rounded-2xl shadow-2xl ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Minutos del temporizador</h2>
        <div className="text-6xl font-bold text-center mb-6 text-green-500 min-w-[200px]">{currentInput || String(fallbackMinutes)}</div>
        <div className={`text-sm text-center mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Ingresa los minutos y presiona Enter
        </div>
        <button
          onClick={handleConfirm}
          className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
        >
          Confirmar
        </button>
        <button
          onClick={onClose}
          className={`w-full mt-2 py-2 px-6 rounded-lg font-semibold transition-colors ${
            isDark ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
