'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { LivingBackground } from './living-background'

interface BackgroundContextValue {
  setIntensity: (value: number) => void
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null)

export function useBackgroundContext() {
  const ctx = useContext(BackgroundContext)
  if (!ctx) throw new Error('usePageIntensity precisa estar dentro de <LivingBackgroundProvider>')
  return ctx
}

/**
 * Monta o LivingBackground UMA VEZ na raiz do app — nunca remonta entre navegações.
 * Cada página anuncia sua própria intensidade via `usePageIntensity`.
 */
export function LivingBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [intensity, setIntensity] = useState(0.3)
  const value = useMemo(() => ({ setIntensity }), [])

  return (
    <BackgroundContext.Provider value={value}>
      <LivingBackground intensity={intensity} />
      {children}
    </BackgroundContext.Provider>
  )
}
