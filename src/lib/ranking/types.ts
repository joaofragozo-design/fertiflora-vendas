export interface VendedorComercial {
  id: string
  codigo: number
  nome: string
  profileId: string | null
  ativo: boolean
  /** Vendedor "casa"/catch-all (ex: Fertiflora, Outros) — não disputa colocação. */
  agregado: boolean
}

export interface RankingEntry {
  id: string
  codigo: number
  nome: string
  profileId: string | null
  avatarUrl: string | null
  localizacao: string | null
  /** null pros agregados (Fertiflora, Outros) — eles não disputam colocação. */
  colocacao: number | null
  agregado: boolean
  /** Já entregue/faturado — ajustado manualmente pelo admin. Decide a colocação. */
  faturado: number
  /** Contratado (Pedido aprovado) mas ainda não faturado — somado automaticamente. */
  pedido: number
  /** faturado + pedido — base de %/falta, igual à planilha original. */
  total: number
  meta: number
  falta: number
  percentual: number
  diasUteisRestantes: number
}

export function vendedorComercialFromRow(row: Record<string, unknown>): VendedorComercial {
  return {
    id: row.id as string,
    codigo: Number(row.codigo),
    nome: row.nome as string,
    profileId: (row.profile_id as string) ?? null,
    ativo: row.ativo as boolean,
    agregado: (row.agregado as boolean) ?? false,
  }
}
