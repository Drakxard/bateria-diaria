"use client"

interface GoalModalProps {
  isOpen: boolean
  currentInput: string
  onConfirm: (hours: number) => void
  onClose: () => void
  isDark: boolean
  isMobile?: boolean
  onInputChange?: (value: string) => void
}

export function GoalModal({
  isOpen,
  currentInput,
  onConfirm,
  onClose,
  isDark,
  isMobile,
  onInputChange,
}: GoalModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    const hours = Number.parseInt(currentInput) || 1
    console.log("[v0] GoalModal confirming hours:", hours)
    onConfirm(hours)
  }

  const handleNumberClick = (num: string) => {
    if (isMobile && onInputChange) {
      onInputChange(currentInput + num)
    }
  }

  const handleBackspace = () => {
    if (isMobile && onInputChange) {
      onInputChange(currentInput.slice(0, -1))
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
      <div
        className={`${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"} rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4`}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">¿Cuántas horas quieres hacer?</h2>
        <div className={`text-6xl font-bold text-center mb-8 ${isDark ? "text-green-400" : "text-green-600"}`}>
          {currentInput || "0"}
        </div>

        {isMobile && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(String(num))}
                className={`p-4 text-2xl font-bold rounded-lg ${
                  isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              className={`p-4 text-xl font-bold rounded-lg ${
                isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              ←
            </button>
            <button
              onClick={() => handleNumberClick("0")}
              className={`p-4 text-2xl font-bold rounded-lg ${
                isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              0
            </button>
            <button
              onClick={handleConfirm}
              className={`p-4 text-xl font-bold rounded-lg ${
                isDark ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"
              } text-white`}
            >
              ✓
            </button>
          </div>
        )}

        <p className="text-sm text-center opacity-70">
          {isMobile ? "Toca ✓ para confirmar" : "Presiona Enter para confirmar"}
        </p>
      </div>
    </div>
  )
}
