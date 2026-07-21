import { createClient } from '@/lib/supabase/server'

export interface TaxasJuros {
  taxaAM: number
  taxaMP: number
}

/** Fallback só pra nunca travar a tela se a linha ainda não existir (não deveria acontecer -- a migration já semeia). */
const TAXAS_PADRAO: TaxasJuros = { taxaAM: 0.022, taxaMP: 0.014 }

/**
 * Nunca lança erro (diferente do resto do padrão de fetch server-side) -- a tabela é nova
 * (migration 057) e pode ainda não existir em produção no momento do deploy; sem essa tabela, cai
 * pro fallback e a tela de Cotação continua funcionando com a taxa antiga em vez de quebrar.
 */
export async function buscarTaxasJuros(): Promise<TaxasJuros> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('taxas_juros_cotacao').select('taxa_am, taxa_mp').limit(1).maybeSingle()
    if (error || !data) return TAXAS_PADRAO
    return { taxaAM: Number(data.taxa_am), taxaMP: Number(data.taxa_mp) }
  } catch {
    return TAXAS_PADRAO
  }
}
