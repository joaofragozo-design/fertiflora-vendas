export type TipoProvocacao = 'parabens' | 'risada' | 'raiva' | 'choro' | 'vamo_vender' | 'meta_nada' | 'vamos_faturar'

/** Quem pode receber uma provocação -- vendedor ou membro da equipe de apoio, sempre por profileId (equipe de apoio não tem código de vendedor). */
export interface AlvoProvocacao {
  profileId: string
  nome: string
}

export interface Provocacao {
  id: string
  remetenteId: string
  tipo: TipoProvocacao
  createdAt: string
}

export function provocacaoFromRow(row: Record<string, unknown>): Provocacao {
  return {
    id: row.id as string,
    remetenteId: row.remetente_id as string,
    tipo: row.tipo as TipoProvocacao,
    createdAt: row.created_at as string,
  }
}

/** Catálogo fixo -- mudar aqui exige atualizar o check constraint da migration 046 também. */
export const CATALOGO_PROVOCACOES: Record<TipoProvocacao, { emoji: string; texto: string }> = {
  parabens: { emoji: '🎉', texto: 'Parabéns!' },
  risada: { emoji: '😂', texto: 'Kkkkk' },
  raiva: { emoji: '😤', texto: 'Aí não!' },
  choro: { emoji: '😭', texto: 'Que dó' },
  vamo_vender: { emoji: '💪', texto: 'Vamo vender!' },
  meta_nada: { emoji: '👀', texto: 'E a meta, nada ainda?' },
  vamos_faturar: { emoji: '🚀', texto: 'Vamos faturar!' },
}
