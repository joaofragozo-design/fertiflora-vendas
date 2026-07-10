import { createClient } from '@/lib/supabase/client'
import { limiteCreditoFromRow, type LimiteCreditoRow } from './types'

/**
 * Limite de crédito do cliente, se a planilha do financeiro tiver conseguido resolver o código
 * dele. Nunca lança erro (só loga e devolve null) -- é um card suplementar no BI do cliente, não
 * pode derrubar o resto da tela (notas, pedidos) só porque a sincronização de crédito ainda não
 * rodou ou a tabela ainda nem existe (ela roda dentro do mesmo Promise.all das outras buscas).
 */
export async function buscarLimiteCreditoDoCliente(clienteCodigo: number): Promise<LimiteCreditoRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clientes_limite_credito')
    .select('*')
    .eq('cliente_codigo', clienteCodigo)
    .maybeSingle()

  if (error) {
    console.error('[creditos] falha ao carregar limite de crédito', error)
    return null
  }
  return data ? limiteCreditoFromRow(data as Record<string, unknown>) : null
}
