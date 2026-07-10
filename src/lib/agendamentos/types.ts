/** Agendamento de carregamento (Programação do sistema de Carregamento) de um cliente do vendedor. */
export interface Agendamento {
  id: string
  data: string // yyyy-mm-dd
  cliente: string
  clienteCodigo: number | null
  observacao: string
  enviadoEm: string | null
  confirmadoEm: string | null
  confirmadoPor: string | null
  totalToneladas: number
}

export function agendamentoFromRow(row: Record<string, unknown>): Agendamento {
  return {
    id: row.id as string,
    data: row.data as string,
    cliente: row.cliente as string,
    clienteCodigo: (row.cliente_codigo as number) ?? null,
    observacao: (row.observacao as string) ?? '',
    enviadoEm: (row.enviado_em as string) ?? null,
    confirmadoEm: (row.confirmado_em as string) ?? null,
    confirmadoPor: (row.confirmado_por as string) ?? null,
    totalToneladas: Number(row.total_toneladas ?? 0),
  }
}
