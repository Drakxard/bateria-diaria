"use client"

interface ExcessTimeModalProps {
  isOpen: boolean
  excessMinutes: number
  timerMinutes: number
  onAccept: () => void
  onReject: () => void
  isDark: boolean
}

export function ExcessTimeModal({
  isOpen,
  excessMinutes,
  timerMinutes,
  onAccept,
  onReject,
  isDark,
}: ExcessTimeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <div
        className={`p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 ${
          isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        }`}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Tiempo excedido</h2>
        <p className="text-center mb-6">
          Has trabajado <span className="font-bold text-green-500">{excessMinutes} minutos</span> más de los{" "}
          <span className="font-bold">{timerMinutes} minutos</span> configurados.
        </p>
        <p className="text-center mb-8 text-sm opacity-75">
          ¿Deseas considerar estos minutos adicionales en tu progreso?
        </p>
        <div className="flex gap-4">
          <button
            onClick={onReject}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
              isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"
            }`}
          >
            No, solo {timerMinutes} min
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 px-6 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white transition-colors"
          >
            Sí, agregar todo
          </button>
        </div>
      </div>
    </div>
  )
}
