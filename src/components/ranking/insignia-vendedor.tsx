import { BadgeTier } from '@/components/perfil/badge-tier'
import { tierAtual } from '@/lib/gamificacao/tiers'

/** Emblema de patamar (Início, 1K, 2K...) calculado a partir do total (faturado + pedido) do vendedor no ranking. */
export function InsigniaVendedor({ totalToneladas, size = 18 }: { totalToneladas: number; size?: number }) {
  const tier = tierAtual(totalToneladas)
  return <BadgeTier tier={tier} size={size} className="shrink-0" />
}
