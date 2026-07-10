export interface Notificacao {
  id: string
  tipo: string
  titulo: string
  corpo: string
  lida: boolean
  createdAt: string
}

export function notificacaoFromRow(row: Record<string, unknown>): Notificacao {
  return {
    id: row.id as string,
    tipo: row.tipo as string,
    titulo: row.titulo as string,
    corpo: row.corpo as string,
    lida: Boolean(row.lida),
    createdAt: row.created_at as string,
  }
}
