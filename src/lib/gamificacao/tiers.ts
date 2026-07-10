export interface Tier {
  chave: string
  min: number
  nome: string
  frase: string
  cores: [string, string]
  wings: boolean
  prisma: boolean
}

/** Patamares em toneladas (faturado + pedido, ranking absoluto -- mesma base do Ranking Comercial). */
export const TIERS: Tier[] = [
  { chave: 'inicio', min: 0, nome: 'Início', frase: 'Toda safra começa com a primeira semente', cores: ['#14b8a6', '#5eead4'], wings: false, prisma: false },
  { chave: 'toneladas_1k', min: 1_000, nome: '1K', frase: 'Recuperador de vendas', cores: ['#2563eb', '#7dd3fc'], wings: false, prisma: false },
  { chave: 'toneladas_2k', min: 2_000, nome: '2K', frase: 'Fechador nato', cores: ['#7c3aed', '#c4b5fd'], wings: false, prisma: false },
  { chave: 'toneladas_3k', min: 3_000, nome: '3K', frase: 'Máquina de vendas', cores: ['#db2777', '#f9a8d4'], wings: false, prisma: false },
  { chave: 'toneladas_4k', min: 4_000, nome: '4K', frase: 'Ritmo que não para', cores: ['#0891b2', '#67e8f9'], wings: false, prisma: false },
  { chave: 'toneladas_5k', min: 5_000, nome: '5K', frase: 'Referência na região', cores: ['#4d7c0f', '#bef264'], wings: false, prisma: false },
  { chave: 'toneladas_7_5k', min: 7_500, nome: '7,5K', frase: 'Presença que vira pedido', cores: ['#16a34a', '#86efac'], wings: true, prisma: false },
  { chave: 'toneladas_10k', min: 10_000, nome: '10K', frase: 'Motor da carteira', cores: ['#ea580c', '#fdba74'], wings: true, prisma: false },
  { chave: 'toneladas_20k', min: 20_000, nome: '20K', frase: 'Um em cada milhão', cores: ['#f59e0b', '#a855f7'], wings: true, prisma: true },
]

export function tierAtual(totalToneladas: number): Tier {
  let atual = TIERS[0]
  for (const t of TIERS) {
    if (totalToneladas >= t.min) atual = t
  }
  return atual
}

export function proximoTier(totalToneladas: number): Tier | null {
  return TIERS.find((t) => t.min > totalToneladas) ?? null
}

export function progressoPct(totalToneladas: number): number {
  const atual = tierAtual(totalToneladas)
  const proximo = proximoTier(totalToneladas)
  if (!proximo) return 100
  const faixa = proximo.min - atual.min
  return Math.min(100, Math.round(((totalToneladas - atual.min) / faixa) * 100))
}

export function tiersDesbloqueadosEntre(totalAntes: number, totalDepois: number): Tier[] {
  return TIERS.filter((t) => t.min > 0 && t.min > totalAntes && t.min <= totalDepois)
}
