"use client"

import { useMemo } from "react"

interface BatteryCylinderProps {
  progress: number // 0 to 1
  isDark: boolean
}

export function BatteryCylinder({ progress, isDark }: BatteryCylinderProps) {
  const fillColor = useMemo(() => {
    const lightGreen = { r: 134, g: 239, b: 172 } // #86efac
    const darkGreen = { r: 22, g: 163, b: 74 } // #16a34a

    const r = Math.round(lightGreen.r + (darkGreen.r - lightGreen.r) * progress)
    const g = Math.round(lightGreen.g + (darkGreen.g - lightGreen.g) * progress)
    const b = Math.round(lightGreen.b + (darkGreen.b - lightGreen.b) * progress)

    return `rgb(${r}, ${g}, ${b})`
  }, [progress])

  const fillHeight = Math.max(5, progress * 100)

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg width="200" height="400" viewBox="0 0 200 400" className="drop-shadow-lg">
        {/* Outer cylinder */}
        <defs>
          <linearGradient id="cylinderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isDark ? "#374151" : "#e5e7eb"} stopOpacity="0.3" />
            <stop offset="50%" stopColor={isDark ? "#4b5563" : "#f3f4f6"} stopOpacity="0.2" />
            <stop offset="100%" stopColor={isDark ? "#374151" : "#e5e7eb"} stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="fillGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.6" />
            <stop offset="50%" stopColor={fillColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Cylinder body */}
        <rect
          x="50"
          y="50"
          width="100"
          height="300"
          rx="10"
          fill="url(#cylinderGradient)"
          stroke={isDark ? "#6b7280" : "#d1d5db"}
          strokeWidth="2"
        />

        {/* Fill liquid */}
        <rect x="55" y={345 - fillHeight * 2.9} width="90" height={fillHeight * 2.9} rx="8" fill="url(#fillGradient)" />

        {/* Battery lightning bolt icon (opaque) */}
        <g opacity="0.85">
          {/* Lightning bolt - diseño más prominente */}

          {/* Highlight para dar profundidad */}
          <path
            d="M 107 145 L 98 195 L 103 195 L 95 250"
            fill="none"
            stroke={isDark ? "#1f2937" : "#ffffff"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />
        </g>
      </svg>
    </div>
  )
}
