'use client'

import { motion } from 'framer-motion'
import { Pencil } from 'lucide-react'
import type { Badge } from '@/lib/ranking/badges'
import type { RankingEntry } from '@/lib/ranking/types'
import { AvatarVendedor } from './avatar-vendedor'
import { BarraProgresso } from './barra-progresso'
import { ChipsBadges } from './chips-badges'
import { fmtPct, fmtT } from './formatadores'

interface CardRankingProps {
  entrada: RankingEntry
  badges: Badge[]
  ehAdmin: boolean
  onAjustar?: (entrada: RankingEntry) => void
}

export function CardRanking({ entrada, badges, ehAdmin, onAjustar }: CardRankingProps) {
  return (
    <motion.div
      layout
      layoutId={`ranking-card-${entrada.id}`}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="glass relative flex items-center gap-3 rounded-2xl p-3.5"
    >
      <div className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs font-extrabold text-white/60">
        {entrada.colocacao}º
      </div>
      <AvatarVendedor nome={entrada.nome} avatarUrl={entrada.avatarUrl} size={36} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{entrada.nome}</span>
          <ChipsBadges badges={badges} compacto />
          <span className="tabular shrink-0 text-xs font-extrabold text-brand-300">{fmtPct(entrada.percentual)}</span>
        </div>

        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="tabular text-sm font-extrabold text-white">{fmtT(entrada.faturado)}</span>
          <span className="tabular text-[10px] font-semibold text-white/40">/ {fmtT(entrada.meta)}</span>
        </div>

        <div className="mt-1.5"><BarraProgresso percentual={entrada.percentual} /></div>

        <div className="mt-1 flex items-center justify-between text-[9.5px] font-semibold text-white/45">
          <span>Falta <span className="tabular text-white/60">{fmtT(entrada.falta)}</span></span>
          <span>Projeção <span className="tabular text-white/60">{fmtT(entrada.projecao)}</span></span>
          <span>{entrada.diasUteisRestantes}d úteis</span>
        </div>
      </div>

      {ehAdmin && (
        <button
          onClick={() => onAjustar?.(entrada)}
          aria-label="Ajustar faturado"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/50 transition-colors hover:bg-white/15 hover:text-white active:scale-90"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  )
}
