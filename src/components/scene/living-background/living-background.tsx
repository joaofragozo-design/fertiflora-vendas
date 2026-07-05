'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Renderer, Geometry, Program, Mesh } from 'ogl'
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shader'
import { useDeviceTier } from './use-device-tier'

interface LivingBackgroundProps {
  /** 0 a 1 — o quanto a cena deve se destacar nessa página (login = 1, telas de trabalho = 0.1–0.3). */
  intensity?: number
  className?: string
}

// Paleta em 0..1 (RGB linear aproximado) — verde da marca, terracota e um dourado quente.
const COR_A: [number, number, number] = [0x18 / 255, 0xa5 / 255, 0x58 / 255]
const COR_B: [number, number, number] = [0xa9 / 255, 0x83 / 255, 0x5f / 255]
const COR_C: [number, number, number] = [0xd4 / 255, 0xaf / 255, 0x37 / 255]

/**
 * Fundo vivo global: um único shader de tela cheia (OGL/WebGL) — nutrientes com
 * deriva orgânica e um brilho de solo que respira devagar. Sem cena 3D, sem loop
 * de física em JS: tudo é função de uTime, então o custo de CPU é ~zero e o de
 * GPU é uma passada só. Renderiza apenas no cliente e nunca compete com o
 * conteúdo — é sempre `fixed inset-0` atrás de tudo.
 */
export function LivingBackground({ intensity = 0.3, className }: LivingBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intensityRef = useRef(intensity)
  const [montado, setMontado] = useState(false)
  const tierConfig = useDeviceTier()

  useEffect(() => setMontado(true), [])
  useEffect(() => { intensityRef.current = intensity }, [intensity])

  useEffect(() => {
    if (!montado || tierConfig.tier === 'off' || !canvasRef.current) return

    const canvas = canvasRef.current
    const renderer = new Renderer({ canvas, alpha: true, antialias: true, dpr: tierConfig.dpr })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)

    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
    })

    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [canvas.clientWidth, canvas.clientHeight] },
        uIntensity: { value: intensityRef.current },
        uPointCount: { value: tierConfig.pontos },
        uColorA: { value: COR_A },
        uColorB: { value: COR_B },
        uColorC: { value: COR_C },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    function resize() {
      const parent = canvas.parentElement
      const largura = parent?.clientWidth ?? window.innerWidth
      const altura = parent?.clientHeight ?? window.innerHeight
      renderer.setSize(largura, altura)
      program.uniforms.uResolution.value = [canvas.width, canvas.height]
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement)

    let raf = 0
    let ativo = true
    function loop(t: number) {
      if (!ativo) return
      program.uniforms.uTime.value = t * 0.001
      program.uniforms.uIntensity.value = intensityRef.current
      renderer.render({ scene: mesh })
      raf = requestAnimationFrame(loop)
    }

    function handleVisibility() {
      if (document.hidden) {
        ativo = false
        cancelAnimationFrame(raf)
      } else if (!ativo) {
        ativo = true
        raf = requestAnimationFrame(loop)
      }
    }

    raf = requestAnimationFrame(loop)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      ativo = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', handleVisibility)
      resizeObserver.disconnect()
      const ext = gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
    }
  }, [montado, tierConfig.tier, tierConfig.dpr, tierConfig.pontos])

  return (
    <div className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-ink-950 via-[#0b1710] to-ink-950 ${className ?? ''}`}>
      {montado && tierConfig.tier !== 'off' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.8, ease: 'easeOut' }} className="absolute inset-0">
          <canvas ref={canvasRef} className="h-full w-full" />
        </motion.div>
      )}
    </div>
  )
}
