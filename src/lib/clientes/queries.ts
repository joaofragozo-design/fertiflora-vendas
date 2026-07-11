import { createClient } from '@/lib/supabase/client'
import { autenticarRealtime } from '@/lib/supabase/realtime'
import { clienteFromRow, clienteToRow, type Cliente, type ClienteInput } from './types'

export async function listarClientes(): Promise<Cliente[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('clientes').select('*').order('nome', { ascending: true })
  if (error) throw new Error(`Falha ao carregar clientes: ${error.message}`)
  return (data ?? []).map(clienteFromRow)
}

export async function buscarCliente(id: string): Promise<Cliente | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Falha ao carregar cliente: ${error.message}`)
  return data ? clienteFromRow(data) : null
}

export async function criarCliente(input: ClienteInput): Promise<Cliente> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — faça login novamente.')

  const { data, error } = await supabase.from('clientes').insert(clienteToRow(input, user.id)).select('*').single()
  if (error) throw new Error(`Falha ao salvar cliente: ${error.message}`)
  return clienteFromRow(data)
}

export function inscreverClientesEmTempoReal(onChange: () => void) {
  const supabase = createClient()
  const channel = supabase
    .channel('clientes-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, onChange)

  autenticarRealtime(supabase).then(() => channel.subscribe())

  return () => { supabase.removeChannel(channel) }
}
