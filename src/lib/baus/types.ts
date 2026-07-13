/** Lista de baús não abertos -- nunca inclui a recompensa, só é revelada ao abrir. */
export interface Bau {
  id: string
  tierChave: string
  createdAt: string
}

export interface RecompensaBau {
  tipoRecompensa: string
  detalheRecompensa: { cor: string }
}

export function bauFromRow(row: Record<string, unknown>): Bau {
  return {
    id: row.id as string,
    tierChave: row.tier_chave as string,
    createdAt: row.created_at as string,
  }
}
