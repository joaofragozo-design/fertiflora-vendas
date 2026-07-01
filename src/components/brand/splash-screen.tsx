'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GrowthScene } from '@/components/scene/growth-scene'
import { Plant } from '@/components/scene/plant'
import { Logo } from '@/components/brand/logo'

interface SplashScreenProps {
  destination: string
}

export function SplashScreen({ destination }: SplashScreenProps) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => router.replace(destination), 1900)
    return () => clearTimeout(timer)
  }, [destination, router])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <GrowthScene />
      <Plant />
      <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
        <Logo variant="full" height={44} priority />
        <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full origin-left animate-[loadbar_1.7s_ease-in-out_forwards] bg-gradient-to-r from-brand-400 to-brand-600" />
        </div>
      </div>
      <style>{`
        @keyframes loadbar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </main>
  )
}
