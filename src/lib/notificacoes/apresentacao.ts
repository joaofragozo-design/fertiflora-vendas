import { Bell, Flame, Gift, type LucideIcon } from 'lucide-react'

interface ApresentacaoTipo {
  Icone: LucideIcon
  tom: string
  fundoNaoLida: string
  /** Tipos "leves" (social/gamificação) não disparam tremor de tela nem som -- só toast + badge.
   *  Reservamos a interrupção forte (tremor+som) pra tipos que ainda não existem no catálogo hoje
   *  (ex.: aprovação de crédito urgente); qualquer tipo desconhecido também é tratado como leve
   *  por padrão, nunca o contrário. */
  leve: boolean
}

const PADRAO: ApresentacaoTipo = { Icone: Bell, tom: 'bg-brand-500/20 text-brand-300', fundoNaoLida: 'bg-brand-500/10', leve: true }

const CATALOGO: Record<string, ApresentacaoTipo> = {
  bau_recompensa: { Icone: Gift, tom: 'bg-warning-500/20 text-warning-400', fundoNaoLida: 'bg-warning-500/10', leve: true },
  provocacao: { Icone: Flame, tom: 'bg-danger-500/20 text-danger-400', fundoNaoLida: 'bg-danger-500/10', leve: true },
}

export function apresentacaoDoTipo(tipo: string): ApresentacaoTipo {
  return CATALOGO[tipo] ?? PADRAO
}
