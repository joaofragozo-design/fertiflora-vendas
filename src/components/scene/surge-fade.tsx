'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/** Envolve o cartão de login: some suavemente quando `growth:surge` dispara (ao confirmar login). */
export function SurgeFade({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onSurge = () => ref.current?.classList.add('opacity-0', 'scale-95', 'blur-sm')
    window.addEventListener('growth:surge', onSurge)
    return () => window.removeEventListener('growth:surge', onSurge)
  }, [])

  return (
    <div ref={ref} className="transition-[opacity,transform,filter] duration-700 ease-out">
      {children}
    </div>
  )
}
