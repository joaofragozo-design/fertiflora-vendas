import type { Parcela } from '@/lib/pricing/prazo-medio'
import type { Cliente } from '@/lib/clientes/types'

const CHAVE = 'fertiflora-cotacao-rascunho'
/** Cotação já é "válida somente hoje" por natureza (preço de tabela muda todo dia) -- rascunho
 * muito antigo (aparelho ficou dias desligado, aba esquecida aberta) tem mais chance de confundir
 * do que ajudar, então some sozinho depois de um tempo em vez de voltar sempre, pra sempre. */
const VALIDADE_MS = 48 * 60 * 60 * 1000

export interface RascunhoCotacao {
  produto: string
  estado: string
  entrega: string
  frete: string
  agenciador: string
  precoVendido: string
  quantidade: string
  modoPagamento: 'avista' | 'parcelado'
  pagamentoAvista: string
  parcelas: Parcela[]
  cliente: Cliente | null
}

/** true se o rascunho tem algo além dos valores padrão de um formulário em branco -- evita restaurar (ou oferecer "começar do zero" para) um rascunho vazio. */
export function rascunhoTemConteudo(r: RascunhoCotacao): boolean {
  return !!r.produto || !!r.cliente || !!r.precoVendido || r.parcelas.some((p) => p.percentual > 0 && p.data)
}

export function salvarRascunho(r: RascunhoCotacao): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ ...r, salvoEm: new Date().toISOString() }))
  } catch {
    // localStorage indisponível (modo privado, quota cheia) -- rascunho só não persiste, não é motivo pra quebrar a tela
  }
}

export function carregarRascunho(): RascunhoCotacao | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const { salvoEm, ...rascunho } = JSON.parse(bruto) as RascunhoCotacao & { salvoEm: string }
    if (Date.now() - new Date(salvoEm).getTime() > VALIDADE_MS) {
      localStorage.removeItem(CHAVE)
      return null
    }
    return rascunho
  } catch {
    return null
  }
}

export function limparRascunho(): void {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // idem salvarRascunho
  }
}
