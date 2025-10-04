"use client"

interface GoalModalProps {
  isOpen: boolean
  currentInput: string
  onConfirm: (hours: number) => void
  onClose: () => void
  isDark: boolean
}

export function GoalModal({ isOpen, currentInput, onConfirm, onClose, isDark }: GoalModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    const hours = Number.parseInt(currentInput) || 1
    console.log("[v0] GoalModal confirming hours:", hours)
    onConfirm(hours)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
      <div
        className={`${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"} rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4`}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Cuantas horas quieres hacer?</h2>
        <div className={`text-6xl font-bold text-center mb-8 ${isDark ? "text-green-400" : "text-green-600"}`}>
          {currentInput || "0"}
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-lg font-semibold rounded-lg ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-lg font-semibold rounded-lg ${isDark ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"} text-white`}
          >
            Confirmar
          </button>
        </div>

        <p className="text-sm text-center opacity-70">Presiona Enter para confirmar</p>
      </div>
    </div>
  )
}
