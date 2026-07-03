'use client'

import { usePageIntensity } from './use-page-intensity'

/** Ponte para Server Components: só anuncia a intensidade do fundo vivo para essa página. */
export function AnunciarIntensidade({ value }: { value: number }) {
  usePageIntensity(value)
  return null
}
