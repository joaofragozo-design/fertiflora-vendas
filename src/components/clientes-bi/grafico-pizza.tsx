'use client'

import { motion } from 'framer-motion'

interface FatiaPizza {
  /** Identificador único (ex: código do cliente) — nomes podem se repetir entre clientes diferentes. */
  id: string | number
  label: string
  valor: number
}

interface GraficoPizzaProps {
  fatias: FatiaPizza[]
  formatarValor: (v: number) => string
  /** Quantas fatias nomear individualmente — o resto vira "Outros". */
  limite?: number
}

const CORES = ['#18a558', '#5fd196', '#a9835f', '#f3b454', '#7ba851', '#0d6b3d', '#6b4f3a']
const COR_OUTROS = 'rgba(255,255,255,0.14)'

export function GraficoPizza({ fatias, formatarValor, limite = 6 }: GraficoPizzaProps) {
  if (fatias.length === 0) return null

  const ordenadas = [...fatias].sort((a, b) => b.valor - a.valor)
  const principais = ordenadas.slice(0, limite)
  const restante = ordenadas.slice(limite)
  const somaRestante = restante.reduce((s, f) => s + f.valor, 0)

  const itens = somaRestante > 0 ? [...principais, { id: 'outros', label: `Outros (${restante.length})`, valor: somaRestante }] : principais
  const total = itens.reduce((s, f) => s + f.valor, 0) || 1

  let acumulado = 0
  const partes = itens.map((item, i) => {
    const inicio = (acumulado / total) * 360
    acumulado += item.valor
    const fim = (acumulado / total) * 360
    const cor = i < principais.length ? CORES[i % CORES.length] : COR_OUTROS
    return { ...item, inicio, fim, cor, pct: (item.valor / total) * 100 }
  })

  const gradiente = partes.map((p) => `${p.cor} ${p.inicio}deg ${p.fim}deg`).join(', ')

  return (
    <div className="flex items-center gap-5">
      <motion.div
        className="h-28 w-28 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${gradiente})` }}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-950">
            <span className="text-[10px] font-bold text-white/50">100%</span>
          </div>
        </div>
      </motion.div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {partes.map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-[11px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.cor }} />
            <span className="min-w-0 flex-1 truncate font-semibold text-white/70">{p.label}</span>
            <span className="tabular shrink-0 font-bold text-white">{p.pct.toFixed(0)}%</span>
          </div>
        ))}
        <p className="mt-0.5 text-[10px] text-white/35">Total: {formatarValor(total)}</p>
      </div>
    </div>
  )
}
