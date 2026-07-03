'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORES, LINHA_SOLO, LARGURA_MUNDO } from './config'

interface PulsoState {
  x: number
  atraso: number
  duracao: number
  tempo: number
}

/** Textura radial branco→transparente usada como alpha do brilho — sem ela o pulso vira um disco de borda dura. */
function useTexturaGlow() {
  return useMemo(() => {
    const tamanho = 128
    const canvas = document.createElement('canvas')
    canvas.width = tamanho
    canvas.height = tamanho
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(tamanho / 2, tamanho / 2, 0, tamanho / 2, tamanho / 2, tamanho / 2)
    grad.addColorStop(0, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, tamanho, tamanho)
    return new THREE.CanvasTexture(canvas)
  }, [])
}

/** Faixa de solo com pulsos de luz que percorrem a superfície de tempos em tempos — nunca dois ao mesmo tempo perto um do outro. */
export function Ground({ intensidade }: { intensidade: number }) {
  const texturaGlow = useTexturaGlow()
  const grupoPulsos = useRef<THREE.Group>(null)
  const pulsos = useMemo<PulsoState[]>(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        x: (Math.random() - 0.5) * LARGURA_MUNDO * 0.8,
        atraso: i * 4 + Math.random() * 3,
        duracao: 3.5 + Math.random() * 1.5,
        tempo: -i * 4,
      })),
    []
  )

  useFrame((_, delta) => {
    if (!grupoPulsos.current) return
    grupoPulsos.current.children.forEach((mesh, i) => {
      const p = pulsos[i]
      p.tempo += delta
      if (p.tempo < 0) {
        mesh.visible = false
        return
      }
      const progresso = (p.tempo % (p.duracao + p.atraso)) / p.duracao
      if (progresso > 1) {
        mesh.visible = false
        if (p.tempo % (p.duracao + p.atraso) < delta * 2) {
          p.x = (Math.random() - 0.5) * LARGURA_MUNDO * 0.8
        }
        return
      }
      mesh.visible = true
      mesh.position.x = p.x
      const escala = Math.sin(progresso * Math.PI) * 0.9 * intensidade
      mesh.scale.setScalar(0.7 + escala)
      const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = Math.sin(progresso * Math.PI) * 0.5 * intensidade
    })
  })

  return (
    <group position={[0, LINHA_SOLO, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[LARGURA_MUNDO * 1.4, 3]} />
        <meshBasicMaterial color={CORES.solo} transparent opacity={0.5 * intensidade} />
      </mesh>

      <group ref={grupoPulsos}>
        {pulsos.map((_, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.4, 1.4]} />
            <meshBasicMaterial map={texturaGlow} color={CORES.pulso} transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
