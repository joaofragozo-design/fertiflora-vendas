'use client'

import { motion } from 'framer-motion'

interface ItemBarra {
  label: string
  valor: number
}

interface GraficoBarrasProps {
  itens: ItemBarra[]
  formatarValor: (v: number) => string
  cor?: string
}

export function GraficoBarras({ itens, formatarValor, cor = '#18a558' }: GraficoBarrasProps) {
  if (itens.length === 0) return null
  const max = Math.max(...itens.map((i) => i.valor), 1)

  return (
    <div className="flex flex-col gap-2.5">
      {itens.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span className="w-14 shrink-0 truncate text-[11px] font-semibold text-white/55">{item.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full"
              style={{ background: cor }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.valor / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="tabular w-16 shrink-0 text-right text-[11px] font-bold text-white">{formatarValor(item.valor)}</span>
        </div>
      ))}
    </div>
  )
}
