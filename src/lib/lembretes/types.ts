export interface Lembrete {
  id: string
  vendedorId: string
  clienteId: string | null
  clienteNome: string | null
  titulo: string
  descricao: string | null
  dataLembrete: string
  concluido: boolean
  concluidoEm: string | null
  createdAt: string
}

export function lembreteFromRow(row: Record<string, unknown>): Lembrete {
  const cliente = row.clientes as { nome?: string } | null
  return {
    id: row.id as string,
    vendedorId: row.vendedor_id as string,
    clienteId: (row.cliente_id as string) ?? null,
    clienteNome: cliente?.nome ?? null,
    titulo: row.titulo as string,
    descricao: (row.descricao as string) ?? null,
    dataLembrete: row.data_lembrete as string,
    concluido: row.concluido as boolean,
    concluidoEm: (row.concluido_em as string) ?? null,
    createdAt: row.criado_em as string,
  }
}
