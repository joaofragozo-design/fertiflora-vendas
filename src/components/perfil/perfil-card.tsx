'use client'

import { useEffect, useState } from 'react'
import { MapPin, Pencil } from 'lucide-react'
import { BadgeTier } from '@/components/perfil/badge-tier'
import { EditarPerfilModal } from '@/components/perfil/editar-perfil-modal'
import { buscarPerfil, type Perfil } from '@/lib/perfil/queries'
import { buscarTotalToneladas, todosOsTiers } from '@/lib/gamificacao/queries'
import { proximoTier, tierAtual, progressoPct } from '@/lib/gamificacao/tiers'
import { cn } from '@/lib/utils/cn'

function fmtT(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' t'
}

interface PerfilCardProps {
  userId: string
  usernameFallback: string
}

export function PerfilCard({ userId, usernameFallback }: PerfilCardProps) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [totalToneladas, setTotalToneladas] = useState<number | null>(null)
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    buscarPerfil(userId, usernameFallback).then(setPerfil).catch(() => setPerfil({ id: userId, username: usernameFallback, apelido: null, avatarUrl: null, pracaAtuacao: null, nomeCompleto: null, telefone: null }))
    buscarTotalToneladas(userId).then(setTotalToneladas).catch(() => setTotalToneladas(0))
  }, [userId, usernameFallback])

  const total = totalToneladas ?? 0
  const tier = tierAtual(total)
  const proximo = proximoTier(total)
  const progresso = progressoPct(total)
  const nomeExibicao = perfil?.apelido || perfil?.username || usernameFallback

  return (
    <>
      <div className="glass flex flex-col gap-4 rounded-3xl p-6">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/20 text-base font-extrabold text-brand-300">
            {perfil?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.avatarUrl} alt={nomeExibicao} className="h-full w-full object-cover" />
            ) : (
              nomeExibicao.slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display min-w-0 truncate text-base font-bold text-white">{nomeExibicao}</h1>
              <button
                onClick={() => setEditando(true)}
                aria-label="Editar perfil"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 transition-colors hover:bg-white/15 hover:text-white active:scale-90"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs font-semibold leading-snug text-white/50">&ldquo;{tier.frase}&rdquo;</p>
            {perfil?.pracaAtuacao && (
              <div className="mt-1 flex items-start gap-1 text-[10.5px] font-bold leading-snug text-earth-tan">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="truncate">Praça de atuação: {perfil.pracaAtuacao}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-white/60">Toneladas vendidas</span>
            <span className="tabular text-brand-300">{totalToneladas === null ? '—' : fmtT(total)}</span>
          </div>
          {proximo && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all" style={{ width: `${progresso}%` }} />
              </div>
              <div className="text-right text-[10px] font-semibold text-white/50">
                Faltam {fmtT(Math.max(0, proximo.min - total))} pro nível {proximo.nome}
              </div>
            </>
          )}
        </div>

        <div
          className="flex gap-2.5 overflow-x-auto pb-1 pt-1"
          style={{ maskImage: 'linear-gradient(to right, black 88%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent 100%)' }}
        >
          {todosOsTiers().map((t) => {
            const desbloqueado = total >= t.min
            const atual = t.chave === tier.chave
            return (
              <div key={t.chave} className="flex shrink-0 flex-col items-center gap-1">
                <div className={cn('rounded-full transition-all', atual && 'shadow-[0_0_0_2px_rgba(24,165,88,0.9),0_0_16px_rgba(24,165,88,0.55)]')}>
                  <BadgeTier tier={t} size={atual ? 44 : 36} bloqueado={!desbloqueado} />
                </div>
                <span className={cn('text-[9px] font-bold', atual ? 'text-brand-300' : desbloqueado ? 'text-white/70' : 'text-white/25')}>
                  {t.min === 0 ? t.nome : `${t.nome} t`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {editando && perfil && (
        <EditarPerfilModal perfil={perfil} onFechar={() => setEditando(false)} onAtualizado={setPerfil} />
      )}
    </>
  )
}
