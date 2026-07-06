import type { Badge } from '@/lib/ranking/badges'

export function ChipsBadges({ badges, compacto = false }: { badges: Badge[]; compacto?: boolean }) {
  if (badges.length === 0) return null
  if (compacto) {
    return (
      <div className="flex shrink-0 items-center gap-0.5" title={badges.map((b) => b.label).join(' · ')}>
        {badges.map((b) => (
          <span key={b.label} className="text-xs leading-none">{b.emoji}</span>
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b.label} className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-bold text-white/80">
          <span>{b.emoji}</span>
          {b.label}
        </span>
      ))}
    </div>
  )
}
