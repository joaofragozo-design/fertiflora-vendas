'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, CheckCircle2, AlertTriangle, Eye, FileClock, Lock, Unlock, Loader2 } from 'lucide-react'
import { destravarCotacao, inscreverConfigCotacaoEmTempoReal, listarCotacoes, travarCotacao } from '@/lib/cotacoes/queries'
import { statusCotacao, type CotacaoConfig, type CotacaoSalva } from '@/lib/cotacoes/types'
import { listarClientes } from '@/lib/clientes/queries'
import type { Cliente } from '@/lib/clientes/types'
import { cn } from '@/lib/utils/cn'
import { ComprovanteCotacao } from '@/components/cotacoes/comprovante-cotacao'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'

function fmtBRL(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

type Aba = 'validas' | 'historico'

interface CotacoesScreenProps {
  ehAdmin: boolean
  configInicial: CotacaoConfig | null
}

export function CotacoesScreen({ ehAdmin, configInicial }: CotacoesScreenProps) {
  usePageIntensity(0.2)
  const [cotacoes, setCotacoes] = useState<CotacaoSalva[]>([])
  const [clientesPorId, setClientesPorId] = useState<Record<string, Cliente>>({})
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<Aba>('validas')
  const [selecionada, setSelecionada] = useState<CotacaoSalva | null>(null)
  const [config, setConfig] = useState(configInicial)
  const [alternandoTrava, setAlternandoTrava] = useState(false)

  useEffect(() => {
    Promise.all([listarCotacoes(), listarClientes()]).then(([c, cli]) => {
      setCotacoes(c)
      setClientesPorId(Object.fromEntries(cli.map((x) => [x.id, x])))
      setCarregando(false)
    })
  }, [])

  useEffect(() => inscreverConfigCotacaoEmTempoReal(setConfig), [])

  async function handleAlternarTrava() {
    if (!config) return
    setAlternandoTrava(true)
    try {
      if (config.travada) {
        await destravarCotacao(config.id)
        toast.success('Cotação destravada — vendedores já podem criar novas cotações')
      } else {
        await travarCotacao(config.id)
        toast.success('Cotação travada — vendedores não conseguem mais criar novas cotações')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao atualizar a trava')
    } finally {
      setAlternandoTrava(false)
    }
  }

  function handleCliqueNovaCotacao(e: React.MouseEvent) {
    if (config?.travada && !ehAdmin) {
      e.preventDefault()
      toast.error('Cotação travada pelo administrador no momento.')
    }
  }

  const filtradas = useMemo(
    () => cotacoes.filter((c) => statusCotacao(c.createdAt) === (aba === 'validas' ? 'valida' : 'historico')),
    [cotacoes, aba]
  )

  if (selecionada) {
    const cliente = selecionada.clienteId ? clientesPorId[selecionada.clienteId] : null
    return <ComprovanteCotacao cotacao={selecionada} clienteNome={cliente?.nome ?? null} onFechar={() => setSelecionada(null)} />
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-bold">Cotações</h1>
          <div className="ml-auto flex items-center gap-2">
            {ehAdmin && config && (
              <button
                onClick={handleAlternarTrava}
                disabled={alternandoTrava}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold transition-colors',
                  config.travada ? 'bg-danger-500/20 text-danger-300' : 'bg-white/8 text-white/60 hover:bg-white/12'
                )}
              >
                {alternandoTrava ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : config.travada ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                {config.travada ? 'Travada' : 'Travar cotação'}
              </button>
            )}
            <Link
              href="/cotacao"
              aria-label="Nova cotação"
              onClick={handleCliqueNovaCotacao}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90',
                !ehAdmin && config?.travada ? 'bg-white/10 text-white/35' : 'bg-brand-500 text-ink-950'
              )}
            >
              {!ehAdmin && config?.travada ? <Lock className="h-4 w-4" /> : <Plus className="h-4.5 w-4.5" />}
            </Link>
          </div>
        </div>

        {config?.travada && (
          <div className="glass flex items-center gap-2.5 rounded-2xl border border-warning-500/30 px-3.5 py-2.5">
            <Lock className="h-4 w-4 shrink-0 text-warning-400" />
            <p className="text-[11.5px] font-semibold leading-snug text-warning-300">
              {ehAdmin ? 'Cotação travada — vendedores não conseguem criar novas cotações agora.' : 'Cotação travada pelo administrador — fale com a diretoria para liberar.'}
            </p>
          </div>
        )}

        <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
          <button
            onClick={() => setAba('validas')}
            className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'validas' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            Cotações válidas
          </button>
          <button
            onClick={() => setAba('historico')}
            className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'historico' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            Histórico
          </button>
        </div>

        <p className="px-1 text-[10.5px] text-white/50">
          {aba === 'validas' ? 'Cotações salvas nos últimos 7 dias.' : 'Cotações com mais de 7 dias — movidas automaticamente pra cá.'}
        </p>

        {carregando && <SkeletonListaCards />}
        {!carregando && filtradas.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <FileClock className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">
              {aba === 'validas' ? 'Nenhuma cotação válida no momento' : 'Nenhuma cotação no histórico ainda'}
            </p>
            {aba === 'validas' && !(config?.travada && !ehAdmin) && <Link href="/cotacao" className="text-xs font-bold text-brand-300">Criar uma cotação</Link>}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filtradas.map((c) => {
            const cliente = c.clienteId ? clientesPorId[c.clienteId] : null
            return (
              <button
                key={c.id}
                onClick={() => setSelecionada(c)}
                className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-white/10"
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', c.aprovado ? 'bg-brand-500/15 text-brand-300' : 'bg-danger-500/15 text-danger-400')}>
                  {c.aprovado ? <CheckCircle2 className="h-4.5 w-4.5" /> : <AlertTriangle className="h-4.5 w-4.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{c.produto}</div>
                  <div className="truncate text-xs text-white/45">{cliente ? cliente.nome : 'Sem cliente vinculado'} · {new Date(c.createdAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="tabular text-sm font-extrabold text-white">{fmtBRL(c.precoVendido)}/t</div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-white/50">
                    <Eye className="h-3 w-3" />
                    Ver comprovante
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </main>
  )
}
