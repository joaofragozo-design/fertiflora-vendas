import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  variant?: 'full' | 'icon'
  height?: number
  className?: string
  priority?: boolean
}

const INTRINSIC = {
  full: { width: 1242, height: 376, src: '/logo-fertiflora.png' },
  icon: { width: 240, height: 376, src: '/logo-icon.png' },
} as const

/** Logo oficial da FertiFlora — usar `variant="icon"` só a marca da folha, `variant="full"` com o lettering. */
export function Logo({ variant = 'full', height = 40, className, priority }: LogoProps) {
  const meta = INTRINSIC[variant]
  const width = Math.round((meta.width / meta.height) * height)

  return (
    <Image
      src={meta.src}
      alt="FertiFlora Organomineral"
      width={width}
      height={height}
      priority={priority}
      className={cn('object-contain', className)}
    />
  )
}
