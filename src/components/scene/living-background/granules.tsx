'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORES, LINHA_SOLO, TOPO_QUEDA, LARGURA_MUNDO } from './config'

interface Granulo {
  x: number
  y: number
  z: number
  velocidade: number
  escalaBase: number
  corIndice: number
}

const CORES_GRANULO = [CORES.granuloA, CORES.granuloB, CORES.granuloC]
const ZONA_DESVANECE = 0.9

function novoGranulo(comecarNoAlto = false): Granulo {
  return {
    x: (Math.random() - 0.5) * LARGURA_MUNDO,
    y: comecarNoAlto ? Math.random() * TOPO_QUEDA : TOPO_QUEDA + Math.random() * 4,
    z: (Math.random() - 0.5) * 2.4,
    velocidade: 0.28 + Math.random() * 0.32,
    escalaBase: 0.6 + Math.random() * 0.7,
    corIndice: Math.floor(Math.random() * CORES_GRANULO.length),
  }
}

/** Grânulos de fertilizante caindo devagar — somem ao "afundar" no solo, sem nunca reaparecer bruscamente. */
export function Granules({ count, intensidade }: { count: number; intensidade: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const granulos = useMemo(() => Array.from({ length: count }, () => novoGranulo(true)), [count])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    granulos.forEach((g, i) => mesh.setColorAt(i, new THREE.Color(CORES_GRANULO[g.corIndice])))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [granulos])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    for (let i = 0; i < granulos.length; i++) {
      const g = granulos[i]
      g.y -= g.velocidade * delta * intensidade

      let escala = g.escalaBase
      const distSolo = g.y - LINHA_SOLO
      if (distSolo < ZONA_DESVANECE) {
        escala *= Math.max(0, distSolo / ZONA_DESVANECE)
      }
      if (g.y < LINHA_SOLO) {
        Object.assign(g, novoGranulo(false))
        escala = 0
      }

      dummy.position.set(g.x, g.y, g.z)
      dummy.scale.setScalar(0.07 * escala)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.4} metalness={0.1} toneMapped={false} />
    </instancedMesh>
  )
}
