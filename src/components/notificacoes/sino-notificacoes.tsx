'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { listarMinhasNotificacoes, marcarTodasComoLidas, inscreverNotificacoesEmTempoReal } from '@/lib/notificacoes/queries'
import type { Notificacao } from '@/lib/notificacoes/types'

function fmtRelativo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}d`
}

/** Sino com contador de não lidas -- abrir o painel marca todas como lidas na hora. */
export function SinoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const carregar = () => { listarMinhasNotificacoes().then(setNotificacoes) }
    carregar()
    return inscreverNotificacoesEmTempoReal(carregar)
  }, [])

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  async function alternar() {
    const abrindo = !aberto
    setAberto(abrindo)
    if (abrindo && naoLidas > 0) {
      setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })))
      await marcarTodasComoLidas()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={alternar}
        aria-label={naoLidas > 0 ? `${naoLidas} notificações não lidas` : 'Notificações'}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white/70 transition-transform active:scale-90"
      >
        <Bell className="h-4.5 w-4.5" />
        {naoLidas > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[9px] font-extrabold text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        // fixed (não absolute) -- o sino não é o elemento mais à direita do header (o botão
        // "Sair" vem depois dele), então "right-0" relativo ao próprio sino ficava deslocado
        // pra esquerda e vazava pra fora da tela em telas estreitas.
        <div
          className="glass isolate fixed right-5 top-20 z-50 flex max-h-96 w-[min(20rem,calc(100vw-2.5rem))] flex-col gap-1 overflow-y-auto rounded-2xl p-2 shadow-xl"
          style={{ backgroundColor: 'rgba(15, 18, 16, 0.97)' }}
        >
          {notificacoes.length === 0 && (
            <p className="p-4 text-center text-xs font-semibold text-white/40">Nenhuma notificação ainda</p>
          )}
          {notificacoes.map((n) => (
            <div key={n.id} className={`flex flex-col gap-0.5 rounded-xl p-3 ${n.lida ? '' : 'bg-brand-500/10'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">{n.titulo}</span>
                <span className="shrink-0 text-[10px] text-white/35">{fmtRelativo(n.createdAt)}</span>
              </div>
              <p className="text-[11px] leading-snug text-white/60">{n.corpo}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
