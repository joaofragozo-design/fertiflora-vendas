'use client'

import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion } from 'framer-motion'
import { Scene } from './scene'
import { useDeviceTier } from './use-device-tier'

interface LivingBackgroundProps {
  /** 0 a 1 — o quanto a cena deve se destacar nessa página (login = 1, telas de trabalho = 0.1–0.3). */
  intensity?: number
  className?: string
}

/**
 * Fundo vivo global: grânulos de fertilizante caindo, solo pulsando, raízes e brotos
 * surgindo devagar. Renderiza só no cliente (WebGL) e nunca compete com o conteúdo —
 * é sempre `fixed inset-0` atrás de tudo.
 */
export function LivingBackground({ intensity = 0.3, className }: LivingBackgroundProps) {
  const [montado, setMontado] = useState(false)
  const tierConfig = useDeviceTier()

  useEffect(() => setMontado(true), [])

  return (
    <div className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-ink-950 via-[#0b1710] to-ink-950 ${className ?? ''}`}>
      {montado && tierConfig.tier !== 'off' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <Canvas
            dpr={tierConfig.dpr}
            gl={{ antialias: tierConfig.tier !== 'low', alpha: true, powerPreference: 'low-power' }}
            camera={{ position: [0, 0.6, 8.5], fov: 42 }}
            frameloop="always"
          >
            <Suspense fallback={null}>
              <Scene intensidade={intensity} tierConfig={tierConfig} />
            </Suspense>
          </Canvas>
        </motion.div>
      )}
    </div>
  )
}
