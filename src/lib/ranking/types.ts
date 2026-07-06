export interface VendedorComercial {
  id: string
  codigo: number
  nome: string
  profileId: string | null
  ativo: boolean
}

export interface RankingEntry {
  id: string
  codigo: number
  nome: string
  profileId: string | null
  avatarUrl: string | null
  colocacao: number
  /** Já entregue/faturado — ajustado manualmente pelo admin. Decide a colocação. */
  faturado: number
  /** Contratado (Pedido aprovado) mas ainda não faturado — somado automaticamente. */
  pedido: number
  /** faturado + pedido — base de %/falta/projeção, igual à planilha original. */
  total: number
  meta: number
  falta: number
  percentual: number
  projecao: number
  diasUteisRestantes: number
}

export function vendedorComercialFromRow(row: Record<string, unknown>): VendedorComercial {
  return {
    id: row.id as string,
    codigo: Number(row.codigo),
    nome: row.nome as string,
    profileId: (row.profile_id as string) ?? null,
    ativo: row.ativo as boolean,
  }
}
