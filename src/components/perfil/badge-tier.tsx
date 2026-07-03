import type { Tier } from '@/lib/gamificacao/tiers'

interface BadgeTierProps {
  tier: Tier
  size?: number
  bloqueado?: boolean
  className?: string
}

/** Emblema hexagonal com estrela — ganha asas e brilho prismático em tiers mais altos. */
export function BadgeTier({ tier, size = 72, bloqueado = false, className }: BadgeTierProps) {
  const gid = `grad-${tier.chave}`
  const [c1, c2] = bloqueado ? ['#3f4a45', '#5a6660'] : tier.cores

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        {tier.prisma && !bloqueado && (
          <linearGradient id={`${gid}-prisma`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="33%" stopColor="#ec4899" />
            <stop offset="66%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        )}
      </defs>

      {tier.wings && (
        <g opacity={bloqueado ? 0.35 : 0.9}>
          <path d="M32 50 L6 34 L10 50 L6 66 Z" fill={`url(#${gid})`} />
          <path d="M68 50 L94 34 L90 50 L94 66 Z" fill={`url(#${gid})`} />
        </g>
      )}

      <polygon
        points="50,6 89,28 89,72 50,94 11,72 11,28"
        fill={tier.prisma && !bloqueado ? `url(#${gid}-prisma)` : `url(#${gid})`}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="2"
      />
      <polygon
        points="50,16 80,33 80,67 50,84 20,67 20,33"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
      />

      <path
        d="M50 30 L56 44 L71 46 L60 56 L63 71 L50 63 L37 71 L40 56 L29 46 L44 44 Z"
        fill="rgba(255,255,255,0.92)"
      />
    </svg>
  )
}
