'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface PontoGrafico {
  label: string
  valor: number
}

interface GraficoLinhaProps {
  pontos: PontoGrafico[]
  formatarValor: (v: number) => string
  cor?: string
}

const LARGURA = 300
const ALTURA = 84

export function GraficoLinha({ pontos, formatarValor, cor = '#5fd196' }: GraficoLinhaProps) {
  const [ativo, setAtivo] = useState<number | null>(null)

  if (pontos.length === 0) return null

  const valores = pontos.map((p) => p.valor)
  const max = Math.max(...valores, 1)
  const min = Math.min(0, ...valores)
  const passo = pontos.length > 1 ? LARGURA / (pontos.length - 1) : 0

  const coords = pontos.map((p, i) => {
    const x = i * passo
    const y = ALTURA - ((p.valor - min) / (max - min || 1)) * (ALTURA - 8) - 4
    return { x, y, ...p }
  })

  const linha = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = `0,${ALTURA} ${linha} ${LARGURA},${ALTURA}`

  const mostrarLabelIdx = new Set([0, Math.floor((pontos.length - 1) / 2), pontos.length - 1])

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full" style={{ height: ALTURA, overflow: 'visible' }}>
        <motion.polygon points={area} fill={cor} initial={{ opacity: 0 }} animate={{ opacity: 0.14 }} transition={{ duration: 0.8, delay: 0.3 }} />
        <motion.polyline
          points={linha}
          fill="none"
          stroke={cor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={ativo === i ? 4 : 3} fill={cor} opacity={ativo === i ? 1 : 0} />
            <circle
              cx={c.x}
              cy={c.y}
              r={10}
              fill="transparent"
              className="cursor-pointer"
              onTouchStart={() => setAtivo(i)}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
            />
          </g>
        ))}
      </svg>

      {ativo !== null && (
        <div
          className="glass pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg px-2 py-1 text-[10px] font-bold text-white"
          style={{ left: `${(coords[ativo].x / LARGURA) * 100}%`, top: `${(coords[ativo].y / ALTURA) * 100}%` }}
        >
          {formatarValor(coords[ativo].valor)}
        </div>
      )}

      <div className="mt-1 flex justify-between text-[8.5px] font-semibold text-white/35">
        {pontos.map((p, i) => (
          <span key={i} className={mostrarLabelIdx.has(i) ? '' : 'invisible'}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}
