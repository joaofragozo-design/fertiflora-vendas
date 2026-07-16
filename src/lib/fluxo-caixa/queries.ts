import { createClient } from '@/lib/supabase/client'
import { autenticarRealtime } from '@/lib/supabase/realtime'
import { debounce } from '@/lib/utils/debounce'
import { chavePeriodoAtual } from './safra'
import { limiteCarteiraPrazoFromRow, type LimiteCarteiraPrazoRow } from './types'

/**
 * Linha vigente do período atual (ex: 'safra-2026'). Se ainda não houver nenhuma definição pra
 * esse período (comum logo após a virada, antes do comitê decidir o novo limite), cai pro
 * registro mais recente de qualquer período -- evita a tela quebrar sem nenhum limite cadastrado.
 */
export async function buscarLimiteVigente(hoje: Date = new Date()): Promise<LimiteCarteiraPrazoRow | null> {
  const supabase = createClient()
  const chave = chavePeriodoAtual(hoje)

  const { data: doPeriodo, error: errPeriodo } = await supabase
    .from('limite_carteira_prazo')
    .select('*')
    .eq('chave_periodo', chave)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (errPeriodo) throw new Error(`Falha ao buscar limite vigente: ${errPeriodo.message}`)
  if (doPeriodo) return limiteCarteiraPrazoFromRow(doPeriodo)

  const { data: maisRecente, error: errRecente } = await supabase
    .from('limite_carteira_prazo')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (errRecente) throw new Error(`Falha ao buscar limite mais recente: ${errRecente.message}`)
  return maisRecente ? limiteCarteiraPrazoFromRow(maisRecente) : null
}

export async function buscarHistoricoLimites(chavePeriodo?: string): Promise<LimiteCarteiraPrazoRow[]> {
  const supabase = createClient()
  let query = supabase.from('limite_carteira_prazo').select('*').order('criado_em', { ascending: false })
  if (chavePeriodo) query = query.eq('chave_periodo', chavePeriodo)
  const { data, error } = await query
  if (error) throw new Error(`Falha ao buscar histórico de limites: ${error.message}`)
  return (data ?? []).map(limiteCarteiraPrazoFromRow)
}

/** Sempre insert -- `limite_carteira_prazo` é histórico, nunca editado (trigger de blindagem na migration 050 rejeita update de valor). */
export async function definirLimiteCarteiraPrazo(input: { chavePeriodo: string; limiteToneladas: number; reservaPct: number }): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('limite_carteira_prazo').insert({
    chave_periodo: input.chavePeriodo,
    limite_toneladas: input.limiteToneladas,
    reserva_pct: input.reservaPct,
    criado_por: user?.id ?? null,
  })
  if (error) throw new Error(`Falha ao definir limite: ${error.message}`)
}

/** Única mutação permitida na tabela -- decisão condicional do Pilar 5 (caixa Nível 3 + garantia de recebimento), sempre manual, nunca automática pela data. */
export async function liberarReservaSafrinha(id: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('limite_carteira_prazo')
    .update({ reserva_liberada: true, reserva_liberada_em: new Date().toISOString(), reserva_liberada_por: user?.id ?? null })
    .eq('id', id)
  if (error) throw new Error(`Falha ao liberar reserva: ${error.message}`)
}

/**
 * Reimportação de CSV é delete+insert em lote (milhares de linhas) -- cada linha afetada dispara
 * um evento `postgres_changes` separado, então sem debounce o consumidor recalcularia os
 * agregados (aging, buckets) centenas/milhares de vezes em sequência durante uma única
 * reimportação. `onChange` roda debounçado (absorve toda a rajada de uma vez).
 */
export function inscreverFluxoCaixaEmTempoReal(onChange: () => void): () => void {
  const supabase = createClient()
  const onChangeDebounced = debounce(onChange, 1200)

  const channel = supabase
    .channel('fluxo-caixa-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_erp_importadas' }, onChangeDebounced)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_liquidadas_importadas' }, onChangeDebounced)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_fiscais_importadas' }, onChangeDebounced)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_erp_importados' }, onChangeDebounced)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'limite_carteira_prazo' }, onChangeDebounced)

  autenticarRealtime(supabase).then(() => channel.subscribe())

  return () => {
    onChangeDebounced.cancel() // senão um disparo já agendado roda depois do unmount, contra setters obsoletos
    supabase.removeChannel(channel)
  }
}
