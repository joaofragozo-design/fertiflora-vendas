export interface Visita {
  id: string
  vendedorId: string
  clienteId: string
  dataVisita: string
  notas: string | null
  proximoPasso: string | null
  createdAt: string
}

export function visitaFromRow(row: Record<string, unknown>): Visita {
  return {
    id: row.id as string,
    vendedorId: row.vendedor_id as string,
    clienteId: row.cliente_id as string,
    dataVisita: row.data_visita as string,
    notas: (row.notas as string) ?? null,
    proximoPasso: (row.proximo_passo as string) ?? null,
    createdAt: row.criado_em as string,
  }
}
