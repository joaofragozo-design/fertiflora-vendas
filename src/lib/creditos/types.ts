/** Linha da planilha de limite de crédito (sincronizada via /api/creditos/sync no repo Carregamento). */
export interface LimiteCreditoRow {
  clienteNomeRaw: string
  clienteCodigo: number | null
  vendedorNomeRaw: string | null
  statusCredito: string
  limiteLiberado: number
  atualizadoEm: string
}

export function limiteCreditoFromRow(row: Record<string, unknown>): LimiteCreditoRow {
  return {
    clienteNomeRaw: row.cliente_nome_raw as string,
    clienteCodigo: (row.cliente_codigo as number) ?? null,
    vendedorNomeRaw: (row.vendedor_nome_raw as string) ?? null,
    statusCredito: (row.status_credito as string) ?? '',
    limiteLiberado: Number(row.limite_liberado ?? 0),
    atualizadoEm: row.atualizado_em as string,
  }
}
