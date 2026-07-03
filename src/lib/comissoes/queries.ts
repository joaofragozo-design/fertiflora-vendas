import { createClient } from '@/lib/supabase/client'
import { listarClientes } from '@/lib/clientes/queries'

export interface ComissaoItem {
  id: string
  produto: string
  clienteNome: string | null
  valor: number
  data: string // ISO yyyy-mm-dd — data em que a comissão cai (vista ou média das parcelas)
  recebida: boolean
}

export async function listarComissoes(vendedorId: string): Promise<ComissaoItem[]> {
  const supabase = createClient()
  const [{ data, error }, clientes] = await Promise.all([
    supabase.from('cotacoes').select('id, produto, cliente_id, comissao_total, dados, created_at').eq('vendedor_id', vendedorId).eq('aprovado', true),
    listarClientes().catch(() => []),
  ])
  if (error) throw new Error(`Falha ao carregar comissões: ${error.message}`)

  const clientesPorId = new Map(clientes.map((c) => [c.id, c.nome]))
  const hojeISO = new Date().toISOString().slice(0, 10)

  return (data ?? []).map((row) => {
    const dados = row.dados as { dataComissao?: string } | null
    const dataComissao = dados?.dataComissao ?? (row.created_at as string).slice(0, 10)
    return {
      id: row.id as string,
      produto: row.produto as string,
      clienteNome: row.cliente_id ? clientesPorId.get(row.cliente_id as string) ?? null : null,
      valor: Number(row.comissao_total ?? 0),
      data: dataComissao,
      recebida: dataComissao <= hojeISO,
    }
  })
}

export function agruparPorMes(itens: ComissaoItem[]): Map<string, ComissaoItem[]> {
  const grupos = new Map<string, ComissaoItem[]>()
  for (const item of itens) {
    const chave = item.data.slice(0, 7) // YYYY-MM
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave)!.push(item)
  }
  return grupos
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function nomeMes(chave: string): string {
  const [ano, mes] = chave.split('-').map(Number)
  return `${MESES[mes - 1]} de ${ano}`
}
