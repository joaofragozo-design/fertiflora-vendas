export interface ComissaoErpRow {
  vendedorCodigo: number
  vendedorNome: string
  nota: string
  pedido: string
  clienteCodigo: number | null
  clienteNome: string
  emissao: string // yyyy-mm-dd
  vencimento: string | null
  /** Data que o cliente pagou o título -- libera/"liquida" a comissão dessa linha. */
  pagamento: string | null
  parcela: number
  liquido: number
  percentualComissao: number
  valorComissao: number
}

export function comissaoErpFromRow(row: Record<string, unknown>): ComissaoErpRow {
  return {
    vendedorCodigo: Number(row.vendedor_codigo),
    vendedorNome: row.vendedor_nome as string,
    nota: (row.nota as string) ?? '',
    pedido: (row.pedido as string) ?? '',
    clienteCodigo: (row.cliente_codigo as number) ?? null,
    clienteNome: row.cliente_nome as string,
    emissao: row.emissao as string,
    vencimento: (row.vencimento as string) ?? null,
    pagamento: (row.pagamento as string) ?? null,
    parcela: Number(row.parcela ?? 0),
    liquido: Number(row.liquido ?? 0),
    percentualComissao: Number(row.percentual_comissao ?? 0),
    valorComissao: Number(row.valor_comissao ?? 0),
  }
}
