'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MessageCircle, Plus, ShieldCheck } from 'lucide-react'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { AvatarVendedor } from '@/components/ranking/avatar-vendedor'
import { listarConversas, listarContatosChat, inscreverChatDiretoEmTempoReal } from '@/lib/chat/queries'
import type { ConversaResumo, ContatoChat } from '@/lib/chat/types'
import { SeletorContatoModal } from './seletor-contato-modal'

function fmtRelativo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}d`
}

export function ListaConversas({ userId }: { userId: string }) {
  const router = useRouter()
  const [conversas, setConversas] = useState<ConversaResumo[]>([])
  const [contatos, setContatos] = useState<ContatoChat[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [seletorAberto, setSeletorAberto] = useState(false)

  function carregar() {
    listarConversas(userId)
      .then((dados) => { setConversas(dados); setErro(null); setCarregando(false) })
      .catch((e) => { setErro(e instanceof Error ? e.message : 'Falha ao carregar conversas'); setCarregando(false) })
  }

  useEffect(() => {
    carregar()
    return inscreverChatDiretoEmTempoReal(carregar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function abrirSeletor() {
    if (contatos.length === 0) {
      listarContatosChat(userId).then(setContatos).catch(() => toast.error('Falha ao carregar contatos'))
    }
    setSeletorAberto(true)
  }

  if (carregando) return <SkeletonListaCards />

  if (erro) {
    return (
      <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
        <ShieldCheck className="h-8 w-8 text-danger-400" />
        <p className="text-sm font-semibold text-white/70">Não foi possível carregar suas conversas</p>
        <p className="text-xs text-white/45">{erro}</p>
        <button onClick={carregar} className="mt-2 text-[11px] font-bold text-brand-300">Tentar de novo</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={abrirSeletor}
        className="glass flex items-center gap-2 self-start rounded-full px-4 py-2 text-xs font-bold text-brand-300 transition-colors hover:bg-white/10"
      >
        <Plus className="h-3.5 w-3.5" />
        Nova conversa
      </button>

      {conversas.length === 0 && (
        <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
          <MessageCircle className="h-8 w-8 text-white/25" />
          <p className="text-sm font-semibold text-white/60">Nenhuma conversa ainda</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {conversas.map((c) => (
          <button
            key={c.outroProfileId}
            onClick={() => router.push(`/chat/${c.outroProfileId}`)}
            className="glass flex items-center gap-3 rounded-2xl p-3.5 text-left transition-colors hover:bg-white/10"
          >
            <AvatarVendedor nome={c.outroNome} avatarUrl={c.outroAvatarUrl} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold text-white">{c.outroNome}</span>
                <span className="shrink-0 text-[10px] text-white/40">{fmtRelativo(c.ultimaMensagemEm)}</span>
              </div>
              <p className="truncate text-xs text-white/50">
                {c.ultimaMensagemTexto ?? (c.ultimaMensagemTemAnexo ? '📎 Anexo' : '')}
              </p>
            </div>
            {c.naoLidas > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger-500 px-1.5 text-[10px] font-extrabold text-white">
                {c.naoLidas > 9 ? '9+' : c.naoLidas}
              </span>
            )}
          </button>
        ))}
      </div>

      {seletorAberto && (
        <SeletorContatoModal
          contatos={contatos}
          onFechar={() => setSeletorAberto(false)}
          onSelecionar={(profileId) => { setSeletorAberto(false); router.push(`/chat/${profileId}`) }}
        />
      )}
    </div>
  )
}
