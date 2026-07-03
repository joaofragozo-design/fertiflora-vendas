'use client'

import { Suspense } from 'react'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Ground } from './ground'
import { Granules } from './granules'
import { Roots } from './roots'
import { Sprouts } from './sprouts'
import type { TierConfig } from './use-device-tier'

interface SceneProps {
  intensidade: number
  tierConfig: TierConfig
}

export function Scene({ intensidade, tierConfig }: SceneProps) {
  const granuleCount = Math.max(4, Math.round(tierConfig.granuleCount * intensidade))
  const maxRaizes = intensidade > 0.5 ? 2 : 1
  const maxBrotos = intensidade > 0.6 ? 2 : 1

  return (
    <Suspense fallback={null}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 4, 3]} intensity={0.4} color="#eafff2" />

      <Ground intensidade={intensidade} />
      <Granules count={granuleCount} intensidade={intensidade} />
      <Roots maxAtivas={maxRaizes} intensidade={intensidade} />
      <Sprouts maxAtivos={maxBrotos} intensidade={intensidade} />

      {tierConfig.enableBloom && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.35} luminanceThreshold={0.25} luminanceSmoothing={0.6} mipmapBlur />
        </EffectComposer>
      )}
    </Suspense>
  )
}
