import { createClient } from '@/lib/supabase/client'
import { autenticarRealtime } from '@/lib/supabase/realtime'
import type { TaxasJuros } from './taxas-juros'

/** Versão client-side de `buscarTaxasJuros` (aquela usa o client de servidor, não pode rodar no browser). */
export async function buscarTaxasJurosAgora(): Promise<TaxasJuros | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('taxas_juros_cotacao').select('taxa_am, taxa_mp').limit(1).maybeSingle()

  if (error) throw new Error(`Falha ao recarregar taxas de juros: ${error.message}`)
  if (!data) return null

  return { taxaAM: Number(data.taxa_am), taxaMP: Number(data.taxa_mp) }
}

/** Sem debounce -- mesmo espírito de inscreverFormulaPrecosEmTempoReal: se a taxa mudar na planilha (MP!D3/G1), a cotação não pode ficar com valor desatualizado. */
export function inscreverTaxasJurosEmTempoReal(onChange: () => void): () => void {
  const supabase = createClient()

  const channel = supabase
    .channel('taxas-juros-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'taxas_juros_cotacao' }, onChange)

  autenticarRealtime(supabase).then(() => channel.subscribe())

  return () => supabase.removeChannel(channel)
}
