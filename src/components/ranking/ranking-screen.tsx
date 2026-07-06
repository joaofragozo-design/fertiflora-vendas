'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { listarRanking, listarHistoricoRecente, inscreverRankingEmTempoReal, type HistoricoPonto } from '@/lib/ranking/queries'
import { calcularBadges } from '@/lib/ranking/badges'
import type { RankingEntry } from '@/lib/ranking/types'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { PodioTop3 } from './podio-top3'
import { CardRanking } from './card-ranking'
import { PainelLateral } from './painel-lateral'
import { AjustarModal } from './ajustar-modal'

const ANO = new Date().getFullYear()

export function RankingScreen({ ehAdmin }: { ehAdmin: boolean }) {
  usePageIntensity(0.25)
  const [entradas, setEntradas] = useState<RankingEntry[]>([])
  const [historico, setHistorico] = useState<HistoricoPonto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ajustando, setAjustando] = useState<RankingEntry | null>(null)

  useEffect(() => {
    let ativo = true
    function carregar() {
      Promise.all([listarRanking(ANO), listarHistoricoRecente()]).then(([r, h]) => {
        if (!ativo) return
        setEntradas(r)
        setHistorico(h)
        setCarregando(false)
      })
    }
    carregar()
    const parar = inscreverRankingEmTempoReal(carregar)
    return () => { ativo = false; parar() }
  }, [])

  const badgesPorVendedor = useMemo(() => calcularBadges(entradas, historico), [entradas, historico])
  const top3 = entradas.slice(0, 3)
  const resto = entradas.slice(3)

  function recarregar() {
    listarRanking(ANO).then(setEntradas)
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6 lg:max-w-6xl lg:flex-row lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-xl">
          <div>
            <h1 className="font-display flex items-center gap-2 text-lg font-bold">
              <Trophy className="h-5 w-5 text-warning-400" />
              Ranking Comercial
            </h1>
            <p className="text-[11px] font-semibold text-white/45">Toneladas faturadas em {ANO}</p>
          </div>

          {carregando && <SkeletonListaCards />}

          {!carregando && entradas.length === 0 && (
            <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
              <Trophy className="h-8 w-8 text-white/25" />
              <p className="text-sm font-semibold text-white/60">Nenhum vendedor no ranking ainda</p>
            </div>
          )}

          {!carregando && top3.length > 0 && (
            <PodioTop3 entradas={top3} badgesPorVendedor={badgesPorVendedor} ehAdmin={ehAdmin} onAjustar={setAjustando} />
          )}

          {!carregando && resto.length > 0 && (
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {resto.map((entrada) => (
                  <CardRanking
                    key={entrada.id}
                    entrada={entrada}
                    badges={badgesPorVendedor.get(entrada.id) ?? []}
                    ehAdmin={ehAdmin}
                    onAjustar={setAjustando}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {!carregando && entradas.length > 0 && (
          <aside className="hidden lg:block lg:w-80 lg:shrink-0">
            <PainelLateral entradas={entradas} historico={historico} ano={ANO} />
          </aside>
        )}
      </div>

      {ajustando && (
        <AjustarModal entrada={ajustando} ano={ANO} onFechar={() => setAjustando(null)} onAtualizado={recarregar} />
      )}
    </main>
  )
}
