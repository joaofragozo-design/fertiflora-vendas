'use client'

import { useEffect, useRef } from 'react'

/**
 * Planta vetorial minimalista, ancorada perto do topo da tela (independente
 * da zona de raízes, que fica só no terço inferior — céu e planta ficam
 * praticamente vazios de propósito). Balança via CSS; recebe um brilho
 * discreto a cada `growth:pulse`, com throttle pra não tremer.
 */
export function Plant() {
  const glowRef = useRef<SVGGElement>(null)
  const lastPulse = useRef(0)

  useEffect(() => {
    const onPulse = () => {
      const now = performance.now()
      if (now - lastPulse.current < 900) return
      lastPulse.current = now
      const el = glowRef.current
      if (!el) return
      el.classList.remove('plant-pulse')
      void el.getBoundingClientRect()
      el.classList.add('plant-pulse')
    }
    window.addEventListener('growth:pulse', onPulse)
    return () => window.removeEventListener('growth:pulse', onPulse)
  }, [])

  return (
    <div className="pointer-events-none absolute left-1/2 top-[7%] z-[1] -translate-x-1/2">
      <svg width="72" height="96" viewBox="0 0 72 96" className="plant-sway">
        <g ref={glowRef}>
          <path d="M36 96 C 35 68, 37 48, 36 32" stroke="#0d6b3d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M36 56 C 24 51, 16 42, 15 30" stroke="#18a558" strokeWidth="2" fill="none" strokeLinecap="round" className="plant-leaf" style={{ animationDelay: '.1s' }} />
          <ellipse cx="13" cy="27" rx="9" ry="5" fill="#2fbd77" transform="rotate(-25 13 27)" className="plant-leaf" style={{ animationDelay: '.15s' }} />
          <path d="M36 48 C 48 43, 55 34, 57 22" stroke="#18a558" strokeWidth="2" fill="none" strokeLinecap="round" className="plant-leaf" style={{ animationDelay: '.25s' }} />
          <ellipse cx="59" cy="19" rx="9" ry="5" fill="#5c8d3a" transform="rotate(25 59 19)" className="plant-leaf" style={{ animationDelay: '.3s' }} />
          <circle cx="36" cy="24" r="4.5" fill="#eafbf1" className="plant-bud" />
          <circle cx="36" cy="24" r="2.5" fill="#f3b454" />
        </g>
      </svg>
    </div>
  )
}
