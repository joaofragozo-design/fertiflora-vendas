import { createClient } from '@/lib/supabase/client'
import { membroEquipeApoioFromRow, type MembroEquipeApoio } from './types'

/** Administradores + suporte (conferência) -- RLS de `profiles` só libera ler o próprio, por isso via RPC (security definer). */
export async function listarEquipeApoio(): Promise<MembroEquipeApoio[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('listar_equipe_apoio')
  if (error) throw new Error(`Falha ao carregar equipe de apoio: ${error.message}`)
  return ((data ?? []) as Record<string, unknown>[]).map(membroEquipeApoioFromRow)
}
