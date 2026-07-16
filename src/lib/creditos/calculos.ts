import { excluirLiquidadas } from '@/lib/comissoes/calculos'
import type { ComissaoErpRow } from '@/lib/comissoes/types'

export type StatusVencimento = 'pago' | 'atraso' | 'vence_essa_semana' | 'a_vencer'

export interface ItemVencimento {
  nota: string
  parcela: number
  vencimento: string | null
  pagamento: string | null
  liquido: number
  status: StatusVencimento
}

export interface ResumoCreditoCliente {
  limiteLiberado: number
  nfAVencer: number
  pedidosEmAberto: number
  /** limiteLiberado - nfAVencer - pedidosEmAberto -- pode ficar negativo (cliente acima do limite). */
  limiteDisponivel: number
  itensVencimento: ItemVencimento[]
}

/**
 * Chave natural de uma linha de comissão (cliente+nota+parcela) -- usada só pra checar se uma
 * linha do relatório "geral" já apareceu como liquidada. Mesmo princípio de `chaveLinha` em
 * comissoes/calculos.ts, mas por cliente em vez de por vendedor: aqui o que importa é "esse
 * título específico já foi pago", não "esse vendedor já recebeu por ele".
 */
function chaveLinha(l: ComissaoErpRow): string {
  return `${l.clienteCodigo}|${l.nota}|${l.parcela}`
}

function paraIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Status de vencimento de um título (ver ItemVencimento) -- comparação por string yyyy-mm-dd,
 * sem conversão de timezone: `atraso` venceu antes de hoje e não foi pago; `vence_essa_semana`
 * vence nos próximos 7 dias (inclusive); o resto é `a_vencer`.
 */
function statusDoVencimento(vencimento: string | null, hoje: Date): StatusVencimento {
  if (!vencimento) return 'a_vencer'
  const hojeIso = paraIso(hoje)
  if (vencimento < hojeIso) return 'atraso'
  const limiteSemana = paraIso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7))
  if (vencimento <= limiteSemana) return 'vence_essa_semana'
  return 'a_vencer'
}

/**
 * Resumo de crédito de um cliente: "NF a vencer" é a soma de `liquido` das linhas do relatório
 * "geral" cuja chave (cliente+nota+parcela) ainda não apareceu em "liquidadas" -- mesma lógica de
 * exclusão usada em `calcularResumoCicloMes`, necessária porque as duas fontes se sobrepõem
 * parcialmente. "Pedidos em aberto" vem de fora (valorSaldo de pedidos_erp_importados, já
 * calculado por `calcularResumoPedidos` na tela) porque é outra fonte, sem relação com comissão.
 */
export function calcularResumoCredito(
  geral: ComissaoErpRow[],
  liquidadas: ComissaoErpRow[],
  limiteLiberado: number,
  pedidosEmAberto: number,
  hoje: Date = new Date()
): ResumoCreditoCliente {
  const naoPagas = excluirLiquidadas(geral, liquidadas, chaveLinha)

  const nfAVencer = naoPagas.reduce((soma, l) => soma + l.liquido, 0)
  const limiteDisponivel = limiteLiberado - nfAVencer - pedidosEmAberto

  const itensVencimento: ItemVencimento[] = [
    ...naoPagas.map((l) => ({
      nota: l.nota,
      parcela: l.parcela,
      vencimento: l.vencimento,
      pagamento: null,
      liquido: l.liquido,
      status: statusDoVencimento(l.vencimento, hoje),
    })),
    ...liquidadas.map((l) => ({
      nota: l.nota,
      parcela: l.parcela,
      vencimento: l.vencimento,
      pagamento: l.pagamento,
      liquido: l.liquido,
      status: 'pago' as const,
    })),
  ].sort((a, b) => (b.vencimento ?? '').localeCompare(a.vencimento ?? ''))

  return { limiteLiberado, nfAVencer, pedidosEmAberto, limiteDisponivel, itensVencimento }
}
