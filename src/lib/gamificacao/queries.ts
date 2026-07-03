import { createClient } from '@/lib/supabase/client'
import { TIERS, tiersDesbloqueadosEntre, type Tier } from './tiers'

export async function buscarTotalComissao(vendedorId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cotacoes')
    .select('comissao_total')
    .eq('vendedor_id', vendedorId)
    .eq('aprovado', true)
  if (error) throw new Error(`Falha ao calcular comissão: ${error.message}`)
  return (data ?? []).reduce((soma, row) => soma + Number(row.comissao_total ?? 0), 0)
}

/** Métrica que move os emblemas: soma de toneladas das cotações aprovadas. */
export async function buscarTotalToneladas(vendedorId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cotacoes')
    .select('quantidade_toneladas')
    .eq('vendedor_id', vendedorId)
    .eq('aprovado', true)
  if (error) throw new Error(`Falha ao calcular toneladas: ${error.message}`)
  return (data ?? []).reduce((soma, row) => soma + Number(row.quantidade_toneladas ?? 0), 0)
}

export async function buscarConquistasChaves(vendedorId: string): Promise<Set<string>> {
  const supabase = createClient()
  const { data, error } = await supabase.from('conquistas').select('chave').eq('vendedor_id', vendedorId)
  if (error) throw new Error(`Falha ao carregar conquistas: ${error.message}`)
  return new Set((data ?? []).map((r) => r.chave as string))
}

export async function registrarConquistas(vendedorId: string, tiers: Tier[]): Promise<void> {
  if (tiers.length === 0) return
  const supabase = createClient()
  await supabase.from('conquistas').upsert(
    tiers.map((t) => ({ vendedor_id: vendedorId, chave: t.chave })),
    { onConflict: 'vendedor_id,chave', ignoreDuplicates: true }
  )
}

/** Compara comissão total antes/depois de salvar uma cotação e registra conquistas novas. */
export async function verificarNovasConquistas(vendedorId: string, totalAntes: number, totalDepois: number): Promise<Tier[]> {
  const jaTinha = await buscarConquistasChaves(vendedorId)
  const candidatas = tiersDesbloqueadosEntre(totalAntes, totalDepois).filter((t) => !jaTinha.has(t.chave))
  await registrarConquistas(vendedorId, candidatas)
  return candidatas
}

export function todosOsTiers(): Tier[] {
  return TIERS
}
