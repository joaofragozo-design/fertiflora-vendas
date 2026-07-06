'use client'

import { motion } from 'framer-motion'
import type { PontoSazonalidade } from '@/lib/clientes-bi/types'

const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function HeatmapSazonalidade({ pontos }: { pontos: PontoSazonalidade[] }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {pontos.map((p, i) => (
        <motion.div
          key={p.mes}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: i * 0.03 }}
          className="flex flex-col items-center gap-1 rounded-lg py-2"
          style={{ background: `rgba(24,165,88,${0.08 + p.intensidade * 0.55})` }}
          title={`${NOMES_MES[p.mes - 1]}: ${p.toneladas.toFixed(1)}t`}
        >
          <span className="text-[9px] font-bold uppercase text-white/60">{NOMES_MES[p.mes - 1]}</span>
          <span className="tabular text-[10px] font-extrabold text-white">{p.toneladas >= 1 ? p.toneladas.toFixed(0) : p.toneladas.toFixed(1)}</span>
        </motion.div>
      ))}
    </div>
  )
}
