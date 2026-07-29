import { createClient } from '@/lib/supabase/client'
import { autenticarRealtime, removerCanalExistente } from '@/lib/supabase/realtime'
import { notificacaoFromRow, type Notificacao } from './types'

/**
 * RLS já restringe a `destinatario_id = auth.uid()` -- não precisa filtrar aqui.
 * Nunca lança erro: o sino aparece em toda página do app (dashboard, mais), então uma falha
 * aqui (ex.: migration da tabela ainda não aplicada) não pode virar um erro não tratado a cada
 * carregamento de tela -- só loga e mostra "sem notificações".
 */
export interface ResultadoNotificacoes {
  /** false = falha real de carregamento (rede, RLS, migration pendente); distinto de "0 notificações". */
  ok: boolean
  dados: Notificacao[]
}

export async function listarMinhasNotificacoes(): Promise<ResultadoNotificacoes> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[notificacoes] falha ao carregar', error)
    return { ok: false, dados: [] }
  }
  return { ok: true, dados: ((data ?? []) as Record<string, unknown>[]).map(notificacaoFromRow) }
}

export async function marcarTodasComoLidas(): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('lida', false)
  if (error) throw new Error(`Falha ao marcar notificações como lidas: ${error.message}`)
}

export function inscreverNotificacoesEmTempoReal(onChange: () => void) {
  const supabase = createClient()
  removerCanalExistente(supabase, 'notificacoes-realtime')
  const channel = supabase
    .channel('notificacoes-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes' }, onChange)

  autenticarRealtime(supabase).then(() => channel.subscribe())

  return () => { supabase.removeChannel(channel) }
}

/** RLS já restringe a `destinatario_id = auth.uid()` -- só chega evento de notificação recebida por mim. */
export function inscreverNovasNotificacoes(onNova: (notificacao: Notificacao) => void) {
  const supabase = createClient()
  removerCanalExistente(supabase, 'notificacoes-novas')
  const channel = supabase
    .channel('notificacoes-novas')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
      onNova(notificacaoFromRow(payload.new as Record<string, unknown>))
    })

  autenticarRealtime(supabase).then(() => channel.subscribe())

  return () => { supabase.removeChannel(channel) }
}
