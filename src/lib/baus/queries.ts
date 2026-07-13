import { createClient } from '@/lib/supabase/client'
import { bauFromRow, type Bau, type RecompensaBau } from './types'

/** Nunca seleciona as colunas de recompensa -- evita "spoiler" antes do vendedor abrir. */
export async function listarMeusBausNaoAbertos(): Promise<Bau[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('baus_recompensa')
    .select('id, tier_chave, created_at')
    .eq('aberto', false)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[baus] falha ao carregar', error)
    return []
  }
  return ((data ?? []) as Record<string, unknown>[]).map(bauFromRow)
}

/** Marca como aberto e revela a recompensa (já sorteada no banco) em um único round-trip. */
export async function abrirBau(id: string): Promise<RecompensaBau> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('baus_recompensa')
    .update({ aberto: true })
    .eq('id', id)
    .select('tipo_recompensa, detalhe_recompensa')
    .single()

  if (error) throw new Error(`Falha ao abrir baú: ${error.message}`)
  return {
    tipoRecompensa: data.tipo_recompensa as string,
    detalheRecompensa: data.detalhe_recompensa as { cor: string },
  }
}
