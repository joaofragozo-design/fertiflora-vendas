'use client'

import { motion } from 'framer-motion'

interface ItemBarra {
  label: string
  valor: number
  corBarra?: string
}

interface GraficoBarrasProps {
  itens: ItemBarra[]
  formatarValor: (v: number) => string
  cor?: string
}

/** Rótulo em cima (sem cortar, quebra linha se precisar) e a barra embaixo — evita truncar nomes longos de produto. */
export function GraficoBarras({ itens, formatarValor, cor = '#18a558' }: GraficoBarrasProps) {
  if (itens.length === 0) return null
  const max = Math.max(...itens.map((i) => i.valor), 1)

  return (
    <div className="flex flex-col gap-3">
      {itens.map((item, i) => (
        <div key={item.label} className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-white/70">{item.label}</span>
            <span className="tabular shrink-0 text-[11px] font-bold text-white">{formatarValor(item.valor)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full"
              style={{ background: item.corBarra ?? cor }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.valor / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
