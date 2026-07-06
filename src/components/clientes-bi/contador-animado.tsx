'use client'

import { useEffect, useRef } from 'react'
import { animate, useMotionValue, useTransform } from 'framer-motion'

interface ContadorAnimadoProps {
  valor: number
  formatar: (v: number) => string
  className?: string
}

/** Anima a contagem sem re-renderizar React a cada frame — escreve direto no DOM via subscription. */
export function ContadorAnimado({ valor, formatar, className }: ContadorAnimadoProps) {
  const motionValue = useMotionValue(0)
  const texto = useTransform(motionValue, (v) => formatar(v))
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(motionValue, valor, { duration: 1, ease: [0.16, 1, 0.3, 1] })
    return controls.stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  useEffect(() => {
    if (spanRef.current) spanRef.current.textContent = formatar(0)
    return texto.on('change', (v) => {
      if (spanRef.current) spanRef.current.textContent = v
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <span ref={spanRef} className={className} />
}
