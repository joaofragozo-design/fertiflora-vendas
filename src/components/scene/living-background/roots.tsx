'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORES, LINHA_SOLO, LARGURA_MUNDO } from './config'

type Fase = 'espera' | 'entra' | 'segura' | 'sai'

interface RaizState {
  fase: Fase
  tempo: number
  duracaoEspera: number
}

function novaCurva(): THREE.QuadraticBezierCurve3 {
  const x0 = (Math.random() - 0.5) * LARGURA_MUNDO * 0.85
  const dx = (Math.random() - 0.5) * 1.6
  const profundidade = 0.9 + Math.random() * 1.1
  return new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x0, LINHA_SOLO + 0.02, 0),
    new THREE.Vector3(x0 + dx * 0.5, LINHA_SOLO - profundidade * 0.6, 0),
    new THREE.Vector3(x0 + dx, LINHA_SOLO - profundidade, 0)
  )
}

const DUR_ENTRA = 2.6
const DUR_SEGURA = 3.5
const DUR_SAI = 2.2

/** Raízes finas que aparecem e desaparecem devagar em pontos aleatórios do solo — nunca mais de duas por vez. */
export function Roots({ maxAtivas, intensidade }: { maxAtivas: number; intensidade: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const estados = useMemo<RaizState[]>(
    () => Array.from({ length: maxAtivas }, (_, i) => ({ fase: 'espera', tempo: -i * 3, duracaoEspera: 3 + Math.random() * 5 })),
    [maxAtivas]
  )

  useEffect(() => {
    refs.current.forEach((mesh) => {
      if (!mesh) return
      mesh.geometry = new THREE.TubeGeometry(novaCurva(), 24, 0.018, 6, false)
    })
  }, [])

  useFrame((_, delta) => {
    estados.forEach((s, i) => {
      const mesh = refs.current[i]
      if (!mesh) return
      s.tempo += delta * intensidade
      const mat = mesh.material as THREE.MeshBasicMaterial

      if (s.fase === 'espera') {
        mat.opacity = 0
        if (s.tempo >= s.duracaoEspera) {
          mesh.geometry.dispose()
          mesh.geometry = new THREE.TubeGeometry(novaCurva(), 24, 0.018, 6, false)
          s.fase = 'entra'
          s.tempo = 0
        }
        return
      }
      if (s.fase === 'entra') {
        mat.opacity = Math.min(1, s.tempo / DUR_ENTRA) * 0.55
        if (s.tempo >= DUR_ENTRA) { s.fase = 'segura'; s.tempo = 0 }
        return
      }
      if (s.fase === 'segura') {
        mat.opacity = 0.55
        if (s.tempo >= DUR_SEGURA) { s.fase = 'sai'; s.tempo = 0 }
        return
      }
      mat.opacity = Math.max(0, 1 - s.tempo / DUR_SAI) * 0.55
      if (s.tempo >= DUR_SAI) {
        s.fase = 'espera'
        s.tempo = 0
        s.duracaoEspera = 4 + Math.random() * 6
      }
    })
  })

  return (
    <>
      {estados.map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }}>
          <meshBasicMaterial color={CORES.raiz} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}
