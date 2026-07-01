'use client'

import { useEffect, useRef } from 'react'
import { GrowthEngine } from './growth-engine'

interface GrowthSceneProps {
  className?: string
}

/**
 * Cena de fundo persistente: solo, raízes e nutrientes fluindo até a planta.
 * Reage a ponteiro/toque. Dispara `growth:pulse` a cada nutriente que chega
 * (o componente Plant escuta) e escuta `growth:surge` pra disparar o boost
 * cinematográfico (ex.: ao confirmar o login).
 */
export function GrowthScene({ className }: GrowthSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GrowthEngine | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fineCursor = window.matchMedia('(pointer: fine)').matches
    const engine = new GrowthEngine(canvas, { reducedMotion, fineCursor })
    engine.onArrive = () => window.dispatchEvent(new Event('growth:pulse'))
    engineRef.current = engine

    const parent = canvas.parentElement!
    const doResize = () => {
      const rect = parent.getBoundingClientRect()
      engine.resize(rect.width, rect.height, Math.min(2, window.devicePixelRatio || 1))
    }
    doResize()
    engine.start()

    const ro = new ResizeObserver(doResize)
    ro.observe(parent)

    const onPointerMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect()
      engine.handlePointerMove(e.clientX - rect.left, e.clientY - rect.top)
    }
    const onPointerLeave = () => engine.handlePointerLeave()
    const onPointerDown = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect()
      engine.handlePointerDown(e.clientX - rect.left, e.clientY - rect.top)
    }
    const onSurge = () => {
      engine.surge()
      wrapperRef.current?.classList.add('growth-dive')
    }
    const onVisibility = () => {
      if (document.hidden) engine.stop()
      else engine.start()
    }

    parent.addEventListener('pointermove', onPointerMove)
    parent.addEventListener('pointerleave', onPointerLeave)
    parent.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('growth:surge', onSurge)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      ro.disconnect()
      parent.removeEventListener('pointermove', onPointerMove)
      parent.removeEventListener('pointerleave', onPointerLeave)
      parent.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('growth:surge', onSurge)
      document.removeEventListener('visibilitychange', onVisibility)
      engine.destroy()
    }
  }, [])

  return (
    <div ref={wrapperRef} className={`growth-wrapper ${className ?? 'fixed inset-0 z-0'}`} aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
