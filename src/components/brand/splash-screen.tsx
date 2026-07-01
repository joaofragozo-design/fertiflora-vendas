'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OrganicBackground } from '@/components/brand/organic-background'
import { Logo } from '@/components/brand/logo'

interface SplashScreenProps {
  destination: string
}

export function SplashScreen({ destination }: SplashScreenProps) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => router.replace(destination), 1600)
    return () => clearTimeout(timer)
  }, [destination, router])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <OrganicBackground />
      <div className="relative z-10 flex flex-col items-center gap-5 animate-fade-in">
        <div className="glass flex h-28 w-28 items-center justify-center rounded-3xl p-4">
          <Logo variant="icon" height={64} priority />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">FertiFlora</p>
          <p className="text-sm font-semibold text-brand-300">Gestão de Vendas</p>
        </div>
        <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full origin-left animate-[loadbar_1.4s_ease-in-out_forwards] bg-gradient-to-r from-brand-300 to-brand-500" />
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
