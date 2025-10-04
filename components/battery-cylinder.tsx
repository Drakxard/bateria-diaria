"use client"

import { useMemo } from "react"

interface BatteryCylinderProps {
  progress: number // 0 to 1
  isDark: boolean
  goalHours: number
}

export function BatteryCylinder({ progress, isDark, goalHours }: BatteryCylinderProps) {
  console.log("[v0] BatteryCylinder render - goalHours:", goalHours, "progress:", progress)

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
    <div className="w-full h-full flex items-center justify-center relative">
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

        <g opacity="0.85">
          {/* Main lightning bolt */}
          <path
            d="M 105 140 L 95 195 L 105 195 L 95 255"
            fill="none"
            stroke={isDark ? "#ffffff" : "#1f2937"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Highlight for depth */}
          <path
            d="M 107 145 L 98 195 L 103 195 L 95 250"
            fill="none"
            stroke={isDark ? "#ffffff" : "#ffffff"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />
        </g>
      </svg>

      <div className="absolute top-[10%] left-1/2 -translate-x-1/2">
        <div className={`text-5xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{goalHours}h</div>
      </div>
    </div>
  )
}
