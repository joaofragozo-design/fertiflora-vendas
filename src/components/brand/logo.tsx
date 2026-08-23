import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

const MARK_ASPECT_RATIO = 289 / 366
const FUNDO_SELO = '#7a5c00' // amarelo-escuro da identidade do Vendas
const AMARELO_CLARO = '#f6e08b' // cor da folha (mesma dos ícones gerados)

interface LogoMarkProps {
  size?: number
  className?: string
  priority?: boolean
}

/** Folha da marca em amarelo-claro — mesma folha do FertiLog e do Trilho STO,
 * recolorida (ver scripts/gerar-marca-amarela.mjs) */
export function LogoMark({ size = 32, className, priority }: LogoMarkProps) {
  const width = Math.round(size * MARK_ASPECT_RATIO)
  return (
    <Image
      src="/fertiflora-mark-amarelo.png"
      alt="FertiFlora"
      width={width}
      height={size}
      priority={priority}
      className={className}
      style={{ objectFit: 'contain', width, height: size }}
    />
  )
}

interface LogoProps {
  variant?: 'full' | 'icon'
  height?: number
  className?: string
  priority?: boolean
}

/** Logo do app — folha amarelo-claro sobre selo amarelo-escuro, no padrão da
 * identidade compartilhada com FertiLog e Trilho STO.
 * `variant="icon"` só o selo, `variant="full"` acrescenta o nome do app. */
export function Logo({ variant = 'full', height = 40, className, priority }: LogoProps) {
  const selo = (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: height, height, borderRadius: Math.round(height * 0.28), backgroundColor: FUNDO_SELO }}
    >
      <LogoMark size={Math.round(height * 0.62)} priority={priority} />
    </span>
  )

  if (variant === 'icon') {
    return <span className={cn('inline-flex', className)}>{selo}</span>
  }

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {selo}
      <span
        className="font-display font-semibold tracking-tight text-white"
        style={{ fontSize: Math.round(height * 0.4), lineHeight: 1 }}
      >
        FertiFlora <span style={{ color: AMARELO_CLARO }}>Vendas</span>
      </span>
    </span>
  )
}
