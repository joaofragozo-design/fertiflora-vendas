'use client'

import { useEffect, useRef } from 'react'

/**
 * Planta vetorial ancorada na linha do solo (46% do topo, mesmo valor usado
 * pelo GrowthEngine). Balança via CSS; recebe um pequeno brilho a cada
 * `growth:pulse` disparado pela cena de fundo, com throttle pra não tremer.
 */
export function Plant() {
  const glowRef = useRef<SVGGElement>(null)
  const lastPulse = useRef(0)

  useEffect(() => {
    const onPulse = () => {
      const now = performance.now()
      if (now - lastPulse.current < 500) return
      lastPulse.current = now
      const el = glowRef.current
      if (!el) return
      el.classList.remove('plant-pulse')
      // força reflow pra permitir reiniciar a animação
      void el.getBoundingClientRect()
      el.classList.add('plant-pulse')
    }
    window.addEventListener('growth:pulse', onPulse)
    return () => window.removeEventListener('growth:pulse', onPulse)
  }, [])

  return (
    <div className="pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 -translate-y-full" style={{ top: '46%' }}>
      <svg width="120" height="170" viewBox="0 0 120 170" className="plant-sway">
        <g ref={glowRef}>
          <path d="M60 170 C 58 120, 62 90, 60 60" stroke="#0d6b3d" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M60 108 C 40 100, 26 84, 24 62" stroke="#18a558" strokeWidth="3" fill="none" strokeLinecap="round" className="plant-leaf" style={{ animationDelay: '.1s' }} />
          <ellipse cx="20" cy="58" rx="16" ry="9" fill="#2fbd77" transform="rotate(-25 20 58)" className="plant-leaf" style={{ animationDelay: '.15s' }} />
          <path d="M60 96 C 82 86, 96 68, 98 48" stroke="#18a558" strokeWidth="3" fill="none" strokeLinecap="round" className="plant-leaf" style={{ animationDelay: '.25s' }} />
          <ellipse cx="102" cy="44" rx="16" ry="9" fill="#5c8d3a" transform="rotate(25 102 44)" className="plant-leaf" style={{ animationDelay: '.3s' }} />
          <path d="M60 76 C 46 66, 38 50, 40 32" stroke="#0d6b3d" strokeWidth="2.5" fill="none" strokeLinecap="round" className="plant-leaf" style={{ animationDelay: '.4s' }} />
          <ellipse cx="37" cy="28" rx="11" ry="6.5" fill="#2fbd77" transform="rotate(-35 37 28)" className="plant-leaf" style={{ animationDelay: '.45s' }} />
          <circle cx="60" cy="46" r="7" fill="#eafbf1" className="plant-bud" />
          <circle cx="60" cy="46" r="4" fill="#f3b454" />
        </g>
      </svg>
    </div>
  )
}
