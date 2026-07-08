'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, ChevronDown, Clock3, TrendingUp, User, Wallet } from 'lucide-react'
import { listarVendedoresComerciais, buscarVendedorComercialDoUsuario } from '@/lib/ranking/queries'
import type { VendedorComercial } from '@/lib/ranking/types'
import { buscarComissoesDoVendedor, buscarComissoesLiquidadasDoVendedor } from '@/lib/comissoes/queries'
import { calcularResumoCicloMes, calcularSerieCiclos, mesDoCiclo, montarItensDoCiclo, type ModoItensComissao } from '@/lib/comissoes/calculos'
import type { ComissaoErpRow } from '@/lib/comissoes/types'
import { cn } from '@/lib/utils/cn'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { ContadorAnimado } from '@/components/clientes-bi/contador-animado'
import { SeletorMes } from './seletor-mes'
import { GraficoCiclos } from './grafico-ciclos'

const HOJE = new Date()
const CICLO_INICIAL = mesDoCiclo(HOJE)

function fmtBRL(v: number) {
  const sinal = v < 0 ? '-' : ''
  return sinal + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDataCurta(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function fmtDataItem(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

export function ComissoesScreen({ userId, ehAdmin }: { userId: string; ehAdmin: boolean }) {
  usePageIntensity(0.15)

  const [vendedores, setVendedores] = useState<VendedorComercial[]>([])
  const [vendedorCodigo, setVendedorCodigo] = useState<number | null>(null)
  const [carregandoVendedor, setCarregandoVendedor] = useState(true)
  const [semVinculo, setSemVinculo] = useState(false)

  const [linhasGeral, setLinhasGeral] = useState<ComissaoErpRow[]>([])
  const [linhasLiquidadas, setLinhasLiquidadas] = useState<ComissaoErpRow[]>([])
  const [carregandoLinhas, setCarregandoLinhas] = useState(false)

  const [anoSelecionado, setAnoSelecionado] = useState(CICLO_INICIAL.ano)
  const [mesSelecionado, setMesSelecionado] = useState(CICLO_INICIAL.mes)
  const [aba, setAba] = useState<'liquidada' | 'aPagar'>('liquidada')

  useEffect(() => {
    let ativo = true
    if (ehAdmin) {
      listarVendedoresComerciais()
        .then((lista) => {
          if (!ativo) return
          const ativos = lista.filter((v) => v.ativo)
          setVendedores(ativos)
          setVendedorCodigo(ativos[0]?.codigo ?? null)
          setCarregandoVendedor(false)
        })
        .catch(() => { if (ativo) { toast.error('Falha ao carregar vendedores'); setCarregandoVendedor(false) } })
    } else {
      buscarVendedorComercialDoUsuario(userId)
        .then((v) => {
          if (!ativo) return
          if (v) setVendedorCodigo(v.codigo)
          else setSemVinculo(true)
          setCarregandoVendedor(false)
        })
        .catch(() => { if (ativo) { toast.error('Falha ao carregar vendedor'); setCarregandoVendedor(false) } })
    }
    return () => { ativo = false }
  }, [ehAdmin, userId])

  useEffect(() => {
    if (vendedorCodigo === null) return
    let ativo = true
    setCarregandoLinhas(true)
    Promise.all([buscarComissoesDoVendedor(vendedorCodigo), buscarComissoesLiquidadasDoVendedor(vendedorCodigo)])
      .then(([geral, liquidadas]) => {
        if (!ativo) return
        setLinhasGeral(geral)
        setLinhasLiquidadas(liquidadas)
        setCarregandoLinhas(false)
      })
      .catch(() => { if (ativo) { toast.error('Falha ao carregar comissões'); setCarregandoLinhas(false) } })
    return () => { ativo = false }
  }, [vendedorCodigo])

  const resumo = useMemo(
    () => calcularResumoCicloMes(linhasGeral, linhasLiquidadas, anoSelecionado, mesSelecionado, HOJE),
    [linhasGeral, linhasLiquidadas, anoSelecionado, mesSelecionado]
  )
  const serie = useMemo(
    () => calcularSerieCiclos(linhasGeral, linhasLiquidadas, 4, 3, HOJE, new Date(anoSelecionado, mesSelecionado - 1, 1)),
    [linhasGeral, linhasLiquidadas, anoSelecionado, mesSelecionado]
  )
  const modoItens: ModoItensComissao = resumo.ehFuturo ? 'projecao' : aba
  const itens = useMemo(
    () => montarItensDoCiclo(linhasGeral, linhasLiquidadas, anoSelecionado, mesSelecionado, modoItens),
    [linhasGeral, linhasLiquidadas, anoSelecionado, mesSelecionado, modoItens]
  )
  const temDados = linhasGeral.length > 0 || linhasLiquidadas.length > 0

  if (carregandoVendedor) return <SkeletonListaCards />

  if (semVinculo) {
    return (
      <main className="relative z-10 min-h-screen pb-28">
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
          <Cabecalho />
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <User className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">Sua conta ainda não está vinculada a um código de vendedor.</p>
            <p className="text-xs text-white/40">Peça pro admin vincular pra você ver suas comissões.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <Cabecalho />

        {ehAdmin && (
          <div className="glass flex items-center gap-2 rounded-2xl p-2.5">
            <User className="h-4 w-4 shrink-0 text-brand-300" />
            <select
              value={vendedorCodigo ?? ''}
              onChange={(e) => setVendedorCodigo(Number(e.target.value))}
              className="w-full flex-1 truncate bg-transparent text-xs font-bold text-white outline-none [&>option]:bg-ink-900"
            >
              {vendedores.map((v) => (
                <option key={v.codigo} value={v.codigo}>#{v.codigo} — {v.nome}</option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
          </div>
        )}

        {carregandoLinhas && <SkeletonListaCards />}

        {!carregandoLinhas && !temDados && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <Wallet className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">Nenhuma comissão importada ainda</p>
          </div>
        )}

        {!carregandoLinhas && temDados && (
          <>
            <SeletorMes ano={anoSelecionado} mes={mesSelecionado} onMudar={(a, m) => { setAnoSelecionado(a); setMesSelecionado(m) }} />

            <div className="glass flex flex-col gap-3 rounded-3xl p-5">
              {resumo.ehFuturo ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Projeção</div>
                  <ContadorAnimado valor={resumo.projecao} formatar={fmtBRL} className="tabular font-display text-2xl font-extrabold text-white" />
                  <p className="mt-1 text-[10.5px] text-white/40">Baseado nas notas já lançadas pra esse ciclo — pode mudar até o fechamento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                      <CheckCircle2 className="h-3 w-3 text-brand-300" />
                      Já liquidada
                    </div>
                    <ContadorAnimado valor={resumo.jaLiquidada} formatar={fmtBRL} className="tabular font-display text-lg font-extrabold text-brand-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                      <Clock3 className="h-3 w-3 text-warning-400" />
                      A pagar
                    </div>
                    <ContadorAnimado valor={resumo.aPagar} formatar={fmtBRL} className="tabular font-display text-lg font-extrabold text-warning-400" />
                  </div>
                </div>
              )}
              <div className="h-px bg-white/8" />
              <p className="text-[10.5px] font-semibold text-white/40">
                Ciclo de pagamento: {fmtDataCurta(resumo.ciclo.inicio)} a {fmtDataCurta(resumo.ciclo.fim)}
              </p>
              <GraficoCiclos serie={serie} anoSelecionado={anoSelecionado} mesSelecionado={mesSelecionado} onSelecionar={(a, m) => { setAnoSelecionado(a); setMesSelecionado(m) }} />
            </div>

            {!resumo.ehFuturo && (
              <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
                <button
                  onClick={() => setAba('liquidada')}
                  className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'liquidada' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
                >
                  Já liquidada
                </button>
                <button
                  onClick={() => setAba('aPagar')}
                  className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'aPagar' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
                >
                  A pagar
                </button>
              </div>
            )}

            {itens.length === 0 && (
              <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
                <TrendingUp className="h-8 w-8 text-white/25" />
                <p className="text-sm font-semibold text-white/60">Nada por aqui nesse ciclo</p>
              </div>
            )}

            {itens.length > 0 && (
              <div className="glass flex flex-col rounded-2xl p-2">
                {itens.map((item, i) => {
                  const data = modoItens === 'liquidada' ? item.pagamento : modoItens === 'aPagar' ? item.vencimento : item.emissao
                  return (
                    <div key={`${item.nota}-${item.parcela}-${i}`} className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-3 last:border-0">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{item.clienteNome}</div>
                        <div className="truncate text-[11px] text-white/45">
                          Nota {item.nota || '—'} · Parcela {item.parcela} · {data ? fmtDataItem(data) : '—'}
                        </div>
                      </div>
                      <div className="tabular shrink-0 text-sm font-extrabold text-white">{fmtBRL(item.valorComissao)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function Cabecalho() {
  return (
    <div className="flex items-center gap-3">
      <Link href="/mais" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
        <ArrowLeft className="h-4.5 w-4.5" />
      </Link>
      <h1 className="font-display text-lg font-bold">Minhas Comissões</h1>
    </div>
  )
}
