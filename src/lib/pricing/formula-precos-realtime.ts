import { createClient } from '@/lib/supabase/client'
import { autenticarRealtime } from '@/lib/supabase/realtime'
import type { FormulaPreco } from './formulas'

/** Versão client-side de `getFormulasComPreco` (aquela usa o client de servidor, não pode rodar no browser). */
export async function buscarFormulasComPrecoAgora(): Promise<FormulaPreco[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('formula_precos')
    .select('nome, preco_usd_avista')
    .order('nome', { ascending: true })

  if (error) throw new Error(`Falha ao recarregar tabela de preços: ${error.message}`)

  return (data ?? []).map((row) => ({
    nome: row.nome as string,
    precoUsdAvista: Number(row.preco_usd_avista),
  }))
}

/**
 * Sem debounce -- diferente de uma reimportação de CSV em lote (milhares de eventos), o sync da
 * planilha de preços faz um upsert por fórmula editada (evento isolado ou poucos por vez), e o
 * pedido é reagir o mais rápido possível (a cotação não pode ficar com preço desatualizado).
 */
export function inscreverFormulaPrecosEmTempoReal(onChange: () => void): () => void {
  const supabase = createClient()

  const channel = supabase
    .channel('formula-precos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'formula_precos' }, onChange)

  autenticarRealtime(supabase).then(() => channel.subscribe())

  return () => supabase.removeChannel(channel)
}
