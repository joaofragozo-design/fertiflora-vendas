import { createClient } from '@/lib/supabase/client'
import { lembreteFromRow, type Lembrete } from './types'

const SELECT_COM_CLIENTE = '*, clientes(nome)'

export async function listarLembretesPendentes(): Promise<Lembrete[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lembretes')
    .select(SELECT_COM_CLIENTE)
    .eq('concluido', false)
    .order('data_lembrete', { ascending: true })
  if (error) throw new Error(`Falha ao carregar lembretes: ${error.message}`)
  return ((data ?? []) as Record<string, unknown>[]).map(lembreteFromRow)
}

export async function listarLembretesProximos(limite = 3): Promise<Lembrete[]> {
  const todos = await listarLembretesPendentes()
  return todos.slice(0, limite)
}

export interface NovoLembrete {
  titulo: string
  descricao: string | null
  dataLembrete: string
  clienteId: string | null
}

export async function criarLembrete(input: NovoLembrete): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — faça login novamente.')
  const { error } = await supabase.from('lembretes').insert({
    vendedor_id: user.id,
    cliente_id: input.clienteId,
    titulo: input.titulo,
    descricao: input.descricao,
    data_lembrete: input.dataLembrete,
  })
  if (error) throw new Error(`Falha ao criar lembrete: ${error.message}`)
}

export async function concluirLembrete(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('lembretes').update({ concluido: true, concluido_em: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`Falha ao concluir lembrete: ${error.message}`)
}

export async function apagarLembrete(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('lembretes').delete().eq('id', id)
  if (error) throw new Error(`Falha ao apagar lembrete: ${error.message}`)
}
