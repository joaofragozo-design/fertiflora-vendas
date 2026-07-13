'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renderiza direto em document.body, fora da árvore da página -- sem isso, um modal
 * "fixed" ainda fica preso no stacking context de um ancestral com position+z-index
 * próprio (ex.: o wrapper "relative z-10" das páginas), perdendo pra elementos com
 * z-index maior em OUTRO lugar da árvore (ex.: o BottomNav, z-40) mesmo o modal tendo
 * z-index bem mais alto -- z-index só compete dentro do mesmo stacking context.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])
  if (!montado) return null
  return createPortal(children, document.body)
}
