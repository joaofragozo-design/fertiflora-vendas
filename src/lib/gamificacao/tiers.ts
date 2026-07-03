export interface Tier {
  chave: string
  min: number
  nome: string
  frase: string
  cores: [string, string]
  wings: boolean
  prisma: boolean
}

export const TIERS: Tier[] = [
  { chave: 'estreante', min: 0, nome: 'Estreante', frase: 'Toda safra começa com a primeira semente', cores: ['#64748b', '#94a3b8'], wings: false, prisma: false },
  { chave: 'comissao_1k', min: 1_000, nome: '1K', frase: 'Recuperador de vendas', cores: ['#a9835f', '#c99a6f'], wings: false, prisma: false },
  { chave: 'comissao_5k', min: 5_000, nome: '5K', frase: 'Fechador nato', cores: ['#b87333', '#e0975a'], wings: false, prisma: false },
  { chave: 'comissao_10k', min: 10_000, nome: '10K', frase: 'Máquina de cotações', cores: ['#94a3b8', '#e2e8f0'], wings: false, prisma: false },
  { chave: 'comissao_25k', min: 25_000, nome: '25K', frase: 'Motor da carteira', cores: ['#2563eb', '#60a5fa'], wings: false, prisma: false },
  { chave: 'comissao_50k', min: 50_000, nome: '50K', frase: 'Presença que vira pedido', cores: ['#0d6b3d', '#18a558'], wings: true, prisma: false },
  { chave: 'comissao_100k', min: 100_000, nome: '100K', frase: 'Lenda da região', cores: ['#d4af37', '#f5d97a'], wings: true, prisma: false },
  { chave: 'comissao_250k', min: 250_000, nome: '250K', frase: 'Referência que a diretoria confia', cores: ['#0891b2', '#67e8f9'], wings: true, prisma: false },
  { chave: 'comissao_500k', min: 500_000, nome: '500K', frase: 'Um em cada milhão', cores: ['#9333ea', '#f0abfc'], wings: true, prisma: false },
  { chave: 'comissao_1m', min: 1_000_000, nome: '1M', frase: 'Hall da Fama FertiFlora', cores: ['#f59e0b', '#a855f7'], wings: true, prisma: true },
]

export function tierAtual(totalComissao: number): Tier {
  let atual = TIERS[0]
  for (const t of TIERS) {
    if (totalComissao >= t.min) atual = t
  }
  return atual
}

export function proximoTier(totalComissao: number): Tier | null {
  return TIERS.find((t) => t.min > totalComissao) ?? null
}

export function progressoPct(totalComissao: number): number {
  const atual = tierAtual(totalComissao)
  const proximo = proximoTier(totalComissao)
  if (!proximo) return 100
  const faixa = proximo.min - atual.min
  return Math.min(100, Math.round(((totalComissao - atual.min) / faixa) * 100))
}

export function tiersDesbloqueadosEntre(totalAntes: number, totalDepois: number): Tier[] {
  return TIERS.filter((t) => t.min > 0 && t.min > totalAntes && t.min <= totalDepois)
}
