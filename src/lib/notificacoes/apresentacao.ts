import { Bell, Flame, Gift, Megaphone, MessageCircle, type LucideIcon } from 'lucide-react'
import { tocarSomMensagem } from '@/lib/audio/notificacao-som'
import type { Notificacao } from './types'

interface ApresentacaoTipo {
  Icone: LucideIcon
  tom: string
  fundoNaoLida: string
  /** Tremor de tela cheia -- reservado pra evento de peso alto (ex.: aprovação de crédito
   *  urgente); nenhum tipo do catálogo hoje usa isso. Tipo desconhecido = sem tremor. */
  tremor: boolean
  /** Função de som a tocar quando chega, ou `false` = nenhum som. Independente do tremor --
   *  permite "toca som mas não treme a tela" (caso do chat: precisa ser notado, mas sem a
   *  interrupção de tela cheia reservada pra emergência). */
  som: (() => void) | false
}

const PADRAO: ApresentacaoTipo = { Icone: Bell, tom: 'bg-brand-500/20 text-brand-300', fundoNaoLida: 'bg-brand-500/10', tremor: false, som: false }

const CATALOGO: Record<string, ApresentacaoTipo> = {
  bau_recompensa: { Icone: Gift, tom: 'bg-warning-500/20 text-warning-400', fundoNaoLida: 'bg-warning-500/10', tremor: false, som: false },
  provocacao: { Icone: Flame, tom: 'bg-danger-500/20 text-danger-400', fundoNaoLida: 'bg-danger-500/10', tremor: false, som: false },
  mensagem_direta: { Icone: MessageCircle, tom: 'bg-brand-500/20 text-brand-300', fundoNaoLida: 'bg-brand-500/10', tremor: false, som: tocarSomMensagem },
  anuncio: { Icone: Megaphone, tom: 'bg-brand-500/20 text-brand-300', fundoNaoLida: 'bg-brand-500/10', tremor: false, som: tocarSomMensagem },
}

export function apresentacaoDoTipo(tipo: string): ApresentacaoTipo {
  return CATALOGO[tipo] ?? PADRAO
}

/** Pra onde navegar ao tocar numa notificação -- null = sem deep-link (fica só no sino). */
export function destinoDaNotificacao(notificacao: Notificacao): string | null {
  if (notificacao.tipo === 'mensagem_direta' && notificacao.remetenteId) return `/chat/${notificacao.remetenteId}`
  if (notificacao.tipo === 'anuncio') return '/chat'
  return null
}
