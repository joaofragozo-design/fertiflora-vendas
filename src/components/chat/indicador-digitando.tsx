'use client'

import { motion } from 'framer-motion'

const PONTOS = [0, 1, 2]

export function IndicadorDigitando() {
  return (
    <div className="flex justify-start">
      <div className="glass flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3">
        {PONTOS.map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/60"
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  )
}
