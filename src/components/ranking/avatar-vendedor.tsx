import { cn } from '@/lib/utils/cn'
import { iniciais } from './formatadores'

interface AvatarVendedorProps {
  nome: string
  avatarUrl: string | null
  size?: number
  tone?: 'gold' | 'silver' | 'bronze' | 'default'
  className?: string
  /** Cor de anel ganha em baú de recompensa -- camada independente do tone (posição no pódio). */
  molduraCor?: string | null
}

const TONS: Record<NonNullable<AvatarVendedorProps['tone']>, string> = {
  gold: 'bg-warning-400/20 text-warning-400 ring-warning-400/40',
  silver: 'bg-mist-200/15 text-mist-50 ring-mist-200/35',
  bronze: 'bg-earth-tan/20 text-earth-tan ring-earth-tan/40',
  default: 'bg-brand-500/20 text-brand-300 ring-white/10',
}

export function AvatarVendedor({ nome, avatarUrl, size = 48, tone = 'default', className, molduraCor }: AvatarVendedorProps) {
  const avatar = (
    <div
      className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold ring-2', TONS[tone], className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={nome} className="h-full w-full object-cover" />
      ) : (
        iniciais(nome)
      )}
    </div>
  )

  if (!molduraCor) return avatar

  return (
    <div className="shrink-0 rounded-full p-[3px]" style={{ background: molduraCor }}>
      {avatar}
    </div>
  )
}
