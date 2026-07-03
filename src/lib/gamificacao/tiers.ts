export interface Tier {
  chave: string
  min: number
  nome: string
  frase: string
  cores: [string, string]
  wings: boolean
  prisma: boolean
}

/** Patamares em toneladas vendidas (soma de `quantidade_toneladas` das cotações aprovadas). */
export const TIERS: Tier[] = [
  { chave: 'estreante', min: 0, nome: 'Estreante', frase: 'Toda safra começa com a primeira semente', cores: ['#64748b', '#94a3b8'], wings: false, prisma: false },
  { chave: 'toneladas_1k', min: 1_000, nome: '1K', frase: 'Recuperador de vendas', cores: ['#a9835f', '#c99a6f'], wings: false, prisma: false },
  { chave: 'toneladas_2k', min: 2_000, nome: '2K', frase: 'Fechador nato', cores: ['#b87333', '#e0975a'], wings: false, prisma: false },
  { chave: 'toneladas_3k', min: 3_000, nome: '3K', frase: 'Máquina de cotações', cores: ['#94a3b8', '#e2e8f0'], wings: false, prisma: false },
  { chave: 'toneladas_10k', min: 10_000, nome: '10K', frase: 'Motor da carteira', cores: ['#2563eb', '#60a5fa'], wings: false, prisma: false },
  { chave: 'toneladas_25k', min: 25_000, nome: '25K', frase: 'Presença que vira pedido', cores: ['#0d6b3d', '#18a558'], wings: true, prisma: false },
  { chave: 'toneladas_50k', min: 50_000, nome: '50K', frase: 'Lenda da região', cores: ['#d4af37', '#f5d97a'], wings: true, prisma: false },
  { chave: 'toneladas_100k', min: 100_000, nome: '100K', frase: 'Um em cada milhão', cores: ['#f59e0b', '#a855f7'], wings: true, prisma: true },
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
