'use client'

import { motion } from 'framer-motion'
import { Flame, MapPin, Pencil } from 'lucide-react'
import type { Badge } from '@/lib/ranking/badges'
import type { RankingEntry } from '@/lib/ranking/types'
import type { AlvoProvocacao } from '@/lib/provocacoes/types'
import { AvatarVendedor } from './avatar-vendedor'
import { BarraProgresso } from './barra-progresso'
import { ChipsBadges } from './chips-badges'
import { InsigniaVendedor } from './insignia-vendedor'
import { TrioFaturamento } from './trio-faturamento'
import { fmtPct, fmtT } from './formatadores'

interface CardRankingProps {
  entrada: RankingEntry
  badges: Badge[]
  ehAdmin: boolean
  userId: string
  onAjustar?: (entrada: RankingEntry) => void
  onProvocar?: (alvo: AlvoProvocacao) => void
}

export function CardRanking({ entrada, badges, ehAdmin, userId, onAjustar, onProvocar }: CardRankingProps) {
  const podeProvocar = !entrada.agregado && entrada.profileId !== null && entrada.profileId !== userId

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
        {entrada.colocacao !== null ? `${entrada.colocacao}º` : '—'}
      </div>
      <AvatarVendedor nome={entrada.nome} avatarUrl={entrada.avatarUrl} size={36} molduraCor={entrada.molduraCor} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <InsigniaVendedor totalToneladas={entrada.total} size={15} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{entrada.nome}</span>
          <ChipsBadges badges={badges} compacto />
          <span className="tabular shrink-0 text-xs font-extrabold text-brand-300">{fmtPct(entrada.percentual)}</span>
          {podeProvocar && (
            <button
              onClick={() => onProvocar?.({ profileId: entrada.profileId as string, nome: entrada.nome })}
              aria-label={`Provocar ${entrada.nome}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/45 transition-colors hover:bg-warning-500/20 hover:text-warning-400 active:scale-90"
            >
              <Flame className="h-3 w-3" />
            </button>
          )}
        </div>

        {entrada.localizacao && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold leading-tight text-earth-tan">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{entrada.localizacao}</span>
          </div>
        )}

        <div className="mt-1.5"><TrioFaturamento faturado={entrada.faturado} pedido={entrada.pedido} total={entrada.total} tamanho="compacto" /></div>

        <div className="mt-1.5"><BarraProgresso percentual={entrada.percentual} /></div>

        <div className="mt-1 flex items-center justify-between text-[9.5px] font-semibold text-white/45">
          <span>Falta <span className="tabular text-white/60">{fmtT(entrada.falta)}</span></span>
          <span>Meta <span className="tabular text-white/60">{fmtT(entrada.meta)}</span></span>
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
