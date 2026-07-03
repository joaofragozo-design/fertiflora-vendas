'use client'

import { useEffect, useState } from 'react'
import { MapPin, Pencil } from 'lucide-react'
import { BadgeTier } from '@/components/perfil/badge-tier'
import { EditarPerfilModal } from '@/components/perfil/editar-perfil-modal'
import { buscarPerfil, type Perfil } from '@/lib/perfil/queries'
import { buscarRegiaoPrincipal, buscarTotalComissao, todosOsTiers } from '@/lib/gamificacao/queries'
import { proximoTier, tierAtual, progressoPct } from '@/lib/gamificacao/tiers'

function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface PerfilCardProps {
  userId: string
  usernameFallback: string
}

export function PerfilCard({ userId, usernameFallback }: PerfilCardProps) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [totalComissao, setTotalComissao] = useState<number | null>(null)
  const [regiao, setRegiao] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    buscarPerfil(userId).then(setPerfil).catch(() => setPerfil({ id: userId, username: usernameFallback, apelido: null, avatarUrl: null }))
    buscarTotalComissao(userId).then(setTotalComissao).catch(() => setTotalComissao(0))
    buscarRegiaoPrincipal(userId).then(setRegiao).catch(() => setRegiao(null))
  }, [userId, usernameFallback])

  const total = totalComissao ?? 0
  const tier = tierAtual(total)
  const proximo = proximoTier(total)
  const progresso = progressoPct(total)
  const nomeExibicao = perfil?.apelido || perfil?.username || usernameFallback

  return (
    <>
      <div className="glass flex flex-col gap-4 rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/20 text-lg font-extrabold text-brand-300">
            {perfil?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.avatarUrl} alt={nomeExibicao} className="h-full w-full object-cover" />
            ) : (
              nomeExibicao.slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display truncate text-base font-bold text-white">{nomeExibicao}</h1>
              <button onClick={() => setEditando(true)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50">
                <Pencil className="h-2.5 w-2.5" />
              </button>
            </div>
            <p className="truncate text-xs font-semibold text-white/50">&ldquo;{tier.frase}&rdquo;</p>
            {regiao && (
              <div className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-earth-tan">
                <MapPin className="h-3 w-3" />
                Praça de destaque: {regiao}
              </div>
            )}
          </div>

          <BadgeTier tier={tier} size={56} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-white/60">Comissão acumulada</span>
            <span className="tabular text-brand-300">{totalComissao === null ? '—' : fmtBRL(total)}</span>
          </div>
          {proximo && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all" style={{ width: `${progresso}%` }} />
              </div>
              <div className="text-right text-[10px] font-semibold text-white/40">
                Faltam {fmtBRL(Math.max(0, proximo.min - total))} pro nível {proximo.nome}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {todosOsTiers().map((t) => (
            <div key={t.chave} className="flex shrink-0 flex-col items-center gap-1">
              <BadgeTier tier={t} size={36} bloqueado={total < t.min} />
              <span className={`text-[9px] font-bold ${total >= t.min ? 'text-white/70' : 'text-white/25'}`}>{t.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {editando && perfil && (
        <EditarPerfilModal perfil={perfil} onFechar={() => setEditando(false)} onAtualizado={setPerfil} />
      )}
    </>
  )
}
