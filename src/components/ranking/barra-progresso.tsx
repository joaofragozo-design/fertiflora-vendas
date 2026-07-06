'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface BarraProgressoProps {
  percentual: number
  tone?: 'gold' | 'silver' | 'bronze' | 'default'
  altura?: 'sm' | 'md'
}

const GRADIENTES: Record<NonNullable<BarraProgressoProps['tone']>, string> = {
  gold: 'from-warning-500 to-warning-400',
  silver: 'from-mist-200/60 to-mist-50',
  bronze: 'from-earth-brown to-earth-tan',
  default: 'from-brand-500 to-brand-300',
}

export function BarraProgresso({ percentual, tone = 'default', altura = 'sm' }: BarraProgressoProps) {
  const largura = Math.min(100, Math.max(0, percentual))
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-white/10', altura === 'sm' ? 'h-1.5' : 'h-2.5')}>
      <motion.div
        className={cn('h-full rounded-full bg-gradient-to-r', GRADIENTES[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${largura}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}
