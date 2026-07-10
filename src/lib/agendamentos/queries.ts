import { createClient } from '@/lib/supabase/client'
import { agendamentoFromRow, type Agendamento } from './types'

/**
 * Agendamentos de carregamento dos clientes do vendedor autenticado —
 * via RPC security definer (zero parâmetros, resolve auth.uid() no servidor,
 * ver migration 043 no repo FertiFloraCarregamento). O agendamento em si é
 * feito na Programação do sistema de Carregamento, não aqui.
 */
export async function listarAgendamentosDoVendedor(): Promise<Agendamento[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('listar_agendamentos_do_vendedor')
  if (error) throw new Error(`Falha ao carregar agendamentos: ${error.message}`)
  return ((data ?? []) as Record<string, unknown>[]).map(agendamentoFromRow)
}
