'use client'

import { useEffect } from 'react'
import { useBackgroundContext } from './background-provider'

/** Cada página chama isso uma vez para anunciar o quanto o fundo vivo deve se destacar (0 a 1). */
export function usePageIntensity(value: number) {
  const { setIntensity } = useBackgroundContext()

  useEffect(() => {
    setIntensity(value)
    return () => setIntensity(0.3)
  }, [value, setIntensity])
}
