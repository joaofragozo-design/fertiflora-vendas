'use client'

import { Flame, ShieldCheck } from 'lucide-react'
import type { MembroEquipeApoio } from '@/lib/equipe-apoio/types'
import { ROTULO_CARGO } from '@/lib/equipe-apoio/types'
import type { AlvoProvocacao } from '@/lib/provocacoes/types'
import { AvatarVendedor } from './avatar-vendedor'

interface EquipeApoioSecaoProps {
  membros: MembroEquipeApoio[]
  userId: string
  onProvocar?: (alvo: AlvoProvocacao) => void
}

/** Administradores + suporte (conferência de pedidos) -- fora do ranking de vendas, mas também recebem provocações. */
export function EquipeApoioSecao({ membros, userId, onProvocar }: EquipeApoioSecaoProps) {
  if (membros.length === 0) return null

  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
        <ShieldCheck className="h-3.5 w-3.5 text-brand-300" />
        Equipe de apoio
      </div>
      <div className="flex flex-col gap-2">
        {membros.map((m) => (
          <div key={m.profileId} className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
            <AvatarVendedor nome={m.nome} avatarUrl={m.avatarUrl} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{m.nome}</div>
              <div className="text-[10px] font-semibold text-white/45">{ROTULO_CARGO[m.cargo]}</div>
            </div>
            {m.profileId !== userId && (
              <button
                onClick={() => onProvocar?.({ profileId: m.profileId, nome: m.nome })}
                aria-label={`Provocar ${m.nome}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/45 transition-colors hover:bg-warning-500/20 hover:text-warning-400 active:scale-90"
              >
                <Flame className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
