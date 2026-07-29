import { createClient } from '@/lib/supabase/client'
import { criarLembrete } from '@/lib/lembretes/queries'
import { visitaFromRow, type Visita } from './types'

export async function listarVisitasDoCliente(clienteId: string): Promise<Visita[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('visitas')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('data_visita', { ascending: false })
  if (error) throw new Error(`Falha ao carregar visitas: ${error.message}`)
  return ((data ?? []) as Record<string, unknown>[]).map(visitaFromRow)
}

export interface NovaVisita {
  clienteId: string
  clienteNome: string
  notas: string | null
  /** Se preenchido, junto com `proximoPassoData`, já cria um lembrete vinculado a este cliente. */
  proximoPasso: string | null
  proximoPassoData: string | null
}

export async function registrarVisita(input: NovaVisita): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada — faça login novamente.')

  const { error } = await supabase.from('visitas').insert({
    vendedor_id: user.id,
    cliente_id: input.clienteId,
    notas: input.notas,
    proximo_passo: input.proximoPasso,
  })
  if (error) throw new Error(`Falha ao registrar visita: ${error.message}`)

  if (input.proximoPasso && input.proximoPassoData) {
    await criarLembrete({
      titulo: `${input.clienteNome}: ${input.proximoPasso}`,
      descricao: input.notas,
      dataLembrete: input.proximoPassoData,
      clienteId: input.clienteId,
    })
  }
}
