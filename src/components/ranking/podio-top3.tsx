'use client'

import { motion } from 'framer-motion'
import { MapPin, Pencil } from 'lucide-react'
import type { Badge } from '@/lib/ranking/badges'
import type { RankingEntry } from '@/lib/ranking/types'
import { AvatarVendedor } from './avatar-vendedor'
import { BarraProgresso } from './barra-progresso'
import { ChipsBadges } from './chips-badges'
import { InsigniaVendedor } from './insignia-vendedor'
import { TrioFaturamento } from './trio-faturamento'
import { fmtPct, fmtT } from './formatadores'

const MEDALHA = ['🥇', '🥈', '🥉'] as const
const TOM = ['gold', 'silver', 'bronze'] as const

interface PodioTop3Props {
  entradas: RankingEntry[]
  badgesPorVendedor: Map<string, Badge[]>
  ehAdmin: boolean
  onAjustar?: (entrada: RankingEntry) => void
}

export function PodioTop3({ entradas, badgesPorVendedor, ehAdmin, onAjustar }: PodioTop3Props) {
  const [lider, ...resto] = entradas
  if (!lider) return null

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        layout
        layoutId={`ranking-card-${lider.id}`}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="glass shadow-glow-gold relative overflow-hidden rounded-3xl border border-warning-400/25 p-5"
      >
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-warning-400/20 blur-3xl" />
        <motion.div
          className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-warning-400/15 blur-3xl"
          animate={{ opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {ehAdmin && (
          <button
            onClick={() => onAjustar?.(lider)}
            aria-label="Ajustar faturado"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white active:scale-90"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <AvatarVendedor nome={lider.nome} avatarUrl={lider.avatarUrl} size={60} tone="gold" />
            <span className="absolute -bottom-1.5 -right-1.5 text-2xl leading-none drop-shadow">{MEDALHA[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-warning-400">Líder do ranking</div>
            <div className="flex items-center gap-1.5">
              <InsigniaVendedor faturado={lider.faturado} size={20} />
              <h2 className="font-display truncate text-lg font-extrabold text-white">{lider.nome}</h2>
            </div>
            {lider.localizacao && (
              <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold leading-tight text-earth-tan">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{lider.localizacao}</span>
              </div>
            )}
            <div className="mt-1"><ChipsBadges badges={badgesPorVendedor.get(lider.id) ?? []} /></div>
          </div>
        </div>

        <div className="relative mt-4">
          <TrioFaturamento faturado={lider.faturado} pedido={lider.pedido} total={lider.total} tone="gold" />
        </div>

        <div className="relative mt-3 flex flex-col gap-1.5">
          <BarraProgresso percentual={lider.percentual} tone="gold" altura="md" />
          <div className="flex items-center justify-between text-[10.5px] font-semibold text-white/50">
            <span className="tabular text-warning-400">{fmtPct(lider.percentual)} da meta ({fmtT(lider.meta)})</span>
            <span>{lider.diasUteisRestantes} dias úteis restantes</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {resto.map((entrada, idx) => {
          const tone = TOM[idx + 1]
          return (
            <motion.div
              key={entrada.id}
              layout
              layoutId={`ranking-card-${entrada.id}`}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="glass relative flex flex-col gap-2.5 rounded-2xl p-3.5"
            >
              {ehAdmin && (
                <button
                  onClick={() => onAjustar?.(entrada)}
                  aria-label="Ajustar faturado"
                  className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/50 transition-colors hover:bg-white/20 hover:text-white active:scale-90"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <AvatarVendedor nome={entrada.nome} avatarUrl={entrada.avatarUrl} size={40} tone={tone} />
                  <span className="absolute -bottom-1 -right-1 text-base leading-none">{MEDALHA[idx + 1]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <InsigniaVendedor faturado={entrada.faturado} size={14} />
                    <span className="truncate text-xs font-bold text-white">{entrada.nome}</span>
                  </div>
                  {entrada.localizacao && (
                    <div className="flex items-center gap-1 text-[9.5px] font-semibold leading-tight text-earth-tan">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{entrada.localizacao}</span>
                    </div>
                  )}
                </div>
              </div>
              <TrioFaturamento faturado={entrada.faturado} pedido={entrada.pedido} total={entrada.total} tamanho="compacto" tone={tone} />
              <BarraProgresso percentual={entrada.percentual} tone={tone} />
              <div className="flex items-center justify-between text-[9.5px] font-semibold text-white/50">
                <span className="tabular">{fmtPct(entrada.percentual)} · Meta {fmtT(entrada.meta)}</span>
                <ChipsBadges badges={badgesPorVendedor.get(entrada.id) ?? []} compacto />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
