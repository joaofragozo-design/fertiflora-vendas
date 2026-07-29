export interface Notificacao {
  id: string
  tipo: string
  titulo: string
  corpo: string
  lida: boolean
  createdAt: string
  /** Só preenchido em notificações originadas do chat -- usado pra deep-link direto na conversa. */
  remetenteId: string | null
}

export function notificacaoFromRow(row: Record<string, unknown>): Notificacao {
  return {
    id: row.id as string,
    tipo: row.tipo as string,
    titulo: row.titulo as string,
    corpo: row.corpo as string,
    lida: Boolean(row.lida),
    createdAt: row.created_at as string,
    remetenteId: (row.remetente_id as string) ?? null,
  }
}
