import { BadgeTier } from '@/components/perfil/badge-tier'
import { tierAtual } from '@/lib/gamificacao/tiers'

/** Emblema de patamar (Estreante, 1K, 2K...) calculado a partir do Faturado do vendedor no ranking. */
export function InsigniaVendedor({ faturado, size = 18 }: { faturado: number; size?: number }) {
  const tier = tierAtual(faturado)
  return <BadgeTier tier={tier} size={size} className="shrink-0" />
}
