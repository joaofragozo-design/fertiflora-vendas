'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AssinaturaCanvasProps {
  onSalvar: (dataUrl: string) => Promise<void>
}

/** Canvas de assinatura à mão -- sem lib externa, só Pointer Events (cobre mouse/touch/caneta). */
export function AssinaturaCanvas({ onSalvar }: AssinaturaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desenhandoRef = useRef(false)
  const [temTraco, setTemTraco] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const retangulo = canvas.getBoundingClientRect()
    canvas.width = retangulo.width
    canvas.height = retangulo.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0b120e'
    }
  }, [])

  function posicao(e: React.PointerEvent<HTMLCanvasElement>) {
    const retangulo = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - retangulo.left, y: e.clientY - retangulo.top }
  }

  function aoComecar(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    desenhandoRef.current = true
    const { x, y } = posicao(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function aoMover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhandoRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = posicao(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setTemTraco(true)
  }

  function aoSoltar() {
    desenhandoRef.current = false
  }

  function limpar() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setTemTraco(false)
  }

  async function handleSalvar() {
    const canvas = canvasRef.current
    if (!canvas || !temTraco) return
    setSalvando(true)
    try {
      await onSalvar(canvas.toDataURL('image/png'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        onPointerDown={aoComecar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerLeave={aoSoltar}
        className="h-40 w-full touch-none rounded-2xl border border-white/15 bg-white"
        aria-label="Área de assinatura -- desenhe com o dedo ou mouse"
      />
      <div className="flex gap-2">
        <button
          onClick={limpar}
          disabled={!temTraco || salvando}
          className="flex items-center gap-1.5 rounded-xl bg-white/8 px-3 py-2 text-xs font-bold text-white/70 transition-colors hover:bg-white/15 disabled:opacity-40"
        >
          <Eraser className="h-3.5 w-3.5" />
          Limpar
        </button>
        <Button onClick={handleSalvar} disabled={!temTraco || salvando} loading={salvando} className="w-auto flex-1">
          Salvar assinatura
        </Button>
      </div>
    </div>
  )
}
