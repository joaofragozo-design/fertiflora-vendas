import { useEffect, useState } from 'react'

export type DeviceTier = 'off' | 'low' | 'mid' | 'high'

export interface TierConfig {
  tier: DeviceTier
  granuleCount: number
  enableBloom: boolean
  dpr: number
  spawnScale: number
}

function detectTier(): DeviceTier {
  if (typeof window === 'undefined') return 'mid'

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off'

  let webglOk = true
  try {
    const canvas = document.createElement('canvas')
    webglOk = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    webglOk = false
  }
  if (!webglOk) return 'off'

  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = navigator.hardwareConcurrency ?? 4
  const mem = nav.deviceMemory ?? 4
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (isMobile) return cores <= 4 || mem <= 4 ? 'low' : 'mid'
  return cores >= 8 && mem >= 8 ? 'high' : 'mid'
}

const CONFIG_POR_TIER: Record<DeviceTier, Omit<TierConfig, 'tier'>> = {
  off: { granuleCount: 0, enableBloom: false, dpr: 1, spawnScale: 0 },
  low: { granuleCount: 18, enableBloom: false, dpr: 1, spawnScale: 0.6 },
  mid: { granuleCount: 34, enableBloom: false, dpr: 1.5, spawnScale: 1 },
  high: { granuleCount: 55, enableBloom: true, dpr: 2, spawnScale: 1.3 },
}

/** Detecta a capacidade do dispositivo uma única vez e devolve os parâmetros de qualidade correspondentes. */
export function useDeviceTier(): TierConfig {
  const [tier, setTier] = useState<DeviceTier>('mid')

  useEffect(() => {
    setTier(detectTier())
  }, [])

  return { tier, ...CONFIG_POR_TIER[tier] }
}
