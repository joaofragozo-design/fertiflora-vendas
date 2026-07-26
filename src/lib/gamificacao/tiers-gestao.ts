import type { Tier } from './tiers'

/** Contas cuja régua de desempenho é a meta geral da empresa (soma de todos os vendedores), não a de um vendedor individual. */
const USERNAMES_GESTAO_GERAL = new Set(['fertiflora2026', 'daniel'])

export function ehGestorGeral(username: string | null | undefined): boolean {
  return !!username && USERNAMES_GESTAO_GERAL.has(username.trim().toLowerCase())
}

/** Patamares de gestão geral -- min é o % da meta geral da empresa atingido no ano (mesma conta do "Resumo geral" do Ranking). */
export const TIERS_GESTAO: Tier[] = [
  { chave: 'gestao_alicerce', min: 0, nome: 'Alicerce', frase: '"Entrega ao Senhor as tuas obras, e teus pensamentos serão bem-sucedidos." (Provérbios 16:3)', cores: ['#334155', '#94a3b8'], wings: false, prisma: false },
  { chave: 'gestao_em_marcha', min: 20, nome: 'Em Marcha', frase: '"Um líder é aquele que conhece o caminho, percorre o caminho e mostra o caminho." (John C. Maxwell)', cores: ['#1e3a8a', '#60a5fa'], wings: false, prisma: false },
  { chave: 'gestao_consolidacao', min: 40, nome: 'Consolidação', frase: '"Os planos do diligente conduzem à fartura, mas os do apressado, somente à pobreza." (Provérbios 21:5)', cores: ['#4c1d95', '#c4b5fd'], wings: false, prisma: false },
  { chave: 'gestao_tracao', min: 60, nome: 'Tração', frase: '"Tudo quanto fizerdes, fazei-o de todo o coração, como para o Senhor, e não para os homens." (Colossenses 3:23)', cores: ['#155e75', '#67e8f9'], wings: true, prisma: false },
  { chave: 'gestao_reta_final', min: 80, nome: 'Reta Final', frase: '"Bom é inimigo de ótimo." (Jim Collins, Good to Great)', cores: ['#92400e', '#fbbf24'], wings: true, prisma: false },
  { chave: 'gestao_meta_batida', min: 100, nome: 'Meta Batida', frase: '"Combati o bom combate, acabei a carreira, guardei a fé." (2 Timóteo 4:7)', cores: ['#166534', '#4ade80'], wings: true, prisma: false },
  { chave: 'gestao_excelencia', min: 120, nome: 'Excelência', frase: '"Viste um homem diligente em sua obra? Perante reis será posto." (Provérbios 22:29)', cores: ['#a16207', '#fde047'], wings: true, prisma: true },
]
