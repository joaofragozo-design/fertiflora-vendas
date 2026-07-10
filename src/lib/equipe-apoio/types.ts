export type CargoApoio = 'admin' | 'conferencia'

export interface MembroEquipeApoio {
  profileId: string
  nome: string
  avatarUrl: string | null
  cargo: CargoApoio
}

export const ROTULO_CARGO: Record<CargoApoio, string> = {
  admin: 'Administrador',
  conferencia: 'Suporte',
}

export function membroEquipeApoioFromRow(row: Record<string, unknown>): MembroEquipeApoio {
  return {
    profileId: row.profile_id as string,
    nome: row.nome as string,
    avatarUrl: (row.avatar_url as string) ?? null,
    cargo: row.role as CargoApoio,
  }
}
