'use client'

import type { LucideIcon } from 'lucide-react'
import { MapPin } from 'lucide-react'
import type { RankingEntry } from '@/lib/ranking/types'
import { AvatarVendedor } from './avatar-vendedor'
import { fmtT } from './formatadores'

const MEDALHA = ['🥇', '🥈', '🥉'] as const

export interface ItemMiniRankingSemanal {
  entrada: RankingEntry
  toneladas: number
}

interface MiniRankingSemanalProps {
  titulo: string
  icone: LucideIcon
  itens: ItemMiniRankingSemanal[]
  vazio: string
}

/** Top 3 da semana (seg-dom) — mesmo estilo visual do "Top crescimento", mas visível no fluxo principal (mobile-first). */
export function MiniRankingSemanal({ titulo, icone: Icone, itens, vazio }: MiniRankingSemanalProps) {
  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/50">
        <Icone className="h-4 w-4 text-brand-300" />
        {titulo}
      </div>
      {itens.length === 0 && <p className="text-xs text-white/40">{vazio}</p>}
      {itens.map(({ entrada, toneladas }, i) => (
        <div key={entrada.id} className="flex items-center gap-2.5">
          <span className="w-4 shrink-0 text-center text-sm leading-none">{MEDALHA[i]}</span>
          <AvatarVendedor nome={entrada.nome} avatarUrl={entrada.avatarUrl} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-white">{entrada.nome}</div>
            {entrada.localizacao && (
              <div className="flex items-center gap-1 text-[9.5px] font-semibold leading-tight text-earth-tan">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{entrada.localizacao}</span>
              </div>
            )}
          </div>
          <span className="tabular shrink-0 text-xs font-extrabold text-brand-300">{fmtT(toneladas)}</span>
        </div>
      ))}
    </div>
  )
}
