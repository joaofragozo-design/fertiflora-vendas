'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORES, LINHA_SOLO, LARGURA_MUNDO } from './config'

type Fase = 'espera' | 'cresce' | 'segura' | 'murcha'

interface BrotoState {
  fase: Fase
  tempo: number
  duracaoEspera: number
  x: number
}

const DUR_CRESCE = 3.2
const DUR_SEGURA = 4
const DUR_MURCHA = 2.4

/** Pequenos brotos que nascem raramente, seguram por um instante e murcham — nunca mais de um por vez por padrão. */
export function Sprouts({ maxAtivos, intensidade }: { maxAtivos: number; intensidade: number }) {
  const refs = useRef<(THREE.Group | null)[]>([])
  const estados = useMemo<BrotoState[]>(
    () =>
      Array.from({ length: maxAtivos }, (_, i) => ({
        fase: 'espera',
        tempo: -i * 6,
        duracaoEspera: 6 + Math.random() * 8,
        x: (Math.random() - 0.5) * LARGURA_MUNDO * 0.85,
      })),
    [maxAtivos]
  )

  useFrame((_, delta) => {
    estados.forEach((s, i) => {
      const grupo = refs.current[i]
      if (!grupo) return
      s.tempo += delta * intensidade

      if (s.fase === 'espera') {
        grupo.scale.setScalar(0.0001)
        if (s.tempo >= s.duracaoEspera) {
          s.x = (Math.random() - 0.5) * LARGURA_MUNDO * 0.85
          grupo.position.x = s.x
          s.fase = 'cresce'
          s.tempo = 0
        }
        return
      }
      if (s.fase === 'cresce') {
        const p = Math.min(1, s.tempo / DUR_CRESCE)
        grupo.scale.setScalar(0.0001 + p * 0.42)
        if (p >= 1) { s.fase = 'segura'; s.tempo = 0 }
        return
      }
      if (s.fase === 'segura') {
        grupo.scale.setScalar(0.42)
        if (s.tempo >= DUR_SEGURA) { s.fase = 'murcha'; s.tempo = 0 }
        return
      }
      const p = Math.max(0, 1 - s.tempo / DUR_MURCHA)
      grupo.scale.setScalar(0.0001 + p * 0.42)
      if (s.tempo >= DUR_MURCHA) {
        s.fase = 'espera'
        s.tempo = 0
        s.duracaoEspera = 8 + Math.random() * 10
      }
    })
  })

  return (
    <>
      {estados.map((s, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }} position={[s.x, LINHA_SOLO, 0]} scale={0.0001}>
          <mesh position={[0, 0.16, 0]}>
            <coneGeometry args={[0.03, 0.34, 6]} />
            <meshStandardMaterial color={CORES.broto} toneMapped={false} />
          </mesh>
          <mesh position={[-0.07, 0.3, 0]} rotation={[0, 0, 0.6]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color={CORES.broto} toneMapped={false} />
          </mesh>
          <mesh position={[0.07, 0.34, 0]} rotation={[0, 0, -0.6]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color={CORES.broto} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}
