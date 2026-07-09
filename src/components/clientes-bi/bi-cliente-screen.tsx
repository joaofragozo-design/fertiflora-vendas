'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronDown, List, Package, Search, ShoppingCart, TrendingUp, User, X } from 'lucide-react'
import { buscarVendedorComercialDoUsuario } from '@/lib/ranking/queries'
import type { VendedorComercial } from '@/lib/ranking/types'
import { buscarNotasDoCliente, buscarPedidosDoCliente, listarClientesDoVendedor, listarVendedoresComNotas } from '@/lib/clientes-bi/queries'
import { calcularInsights, calcularKpis, calcularResumoPedidos, calcularSazonalidade, calcularSerieAnual, calcularSerieMensal, calcularTopProdutos } from '@/lib/clientes-bi/calculos'
import type { ClienteResumo, NotaFiscalRow, PedidoErpRow, VendedorComNotas } from '@/lib/clientes-bi/types'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { GraficoBarras } from './grafico-barras'
import { VisaoGeralVendedor } from './visao-geral-vendedor'
import { HeatmapSazonalidade } from './heatmap-sazonalidade'
import { ContadorAnimado } from './contador-animado'
import { PedidoProgresso } from './pedido-progresso'

const ANO = new Date().getFullYear()
const NOMES_MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function fmtT(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + 't'
}
function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtBRLCompleto(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(v: number) {
  const sinal = v >= 0 ? '+' : ''
  return `${sinal}${v.toFixed(0)}%`
}

export function BiClienteScreen({ userId, ehAdmin }: { userId: string; ehAdmin: boolean }) {
  const [vendedores, setVendedores] = useState<VendedorComNotas[]>([])
  const [vendedorCodigo, setVendedorCodigo] = useState<number | null>(null)
  const [carregandoVendedor, setCarregandoVendedor] = useState(true)
  const [semVinculo, setSemVinculo] = useState(false)

  const [clientes, setClientes] = useState<ClienteResumo[]>([])
  const [busca, setBusca] = useState('')
  const [listaAberta, setListaAberta] = useState(false)
  const [clienteCodigo, setClienteCodigo] = useState<number | null>(null)
  const [carregandoClientes, setCarregandoClientes] = useState(false)

  const [notas, setNotas] = useState<NotaFiscalRow[]>([])
  const [pedidos, setPedidos] = useState<PedidoErpRow[]>([])
  const [carregandoNotas, setCarregandoNotas] = useState(false)
  const [serieChave, setSerieChave] = useState<'toneladas' | 'reais'>('toneladas')
  const [produtosChave, setProdutosChave] = useState<'toneladas' | 'reais'>('reais')
  const [pedidosChave, setPedidosChave] = useState<'toneladas' | 'reais'>('toneladas')

  // Descobre o código do vendedor: admin escolhe, vendedor comum usa o vínculo da própria conta.
  useEffect(() => {
    if (ehAdmin) {
      listarVendedoresComNotas().then((lista) => {
        setVendedores(lista)
        setVendedorCodigo(lista[0]?.codigo ?? null)
        setCarregandoVendedor(false)
      })
    } else {
      buscarVendedorComercialDoUsuario(userId).then((v: VendedorComercial | null) => {
        if (v) setVendedorCodigo(v.codigo)
        else setSemVinculo(true)
        setCarregandoVendedor(false)
      })
    }
  }, [ehAdmin, userId])

  useEffect(() => {
    if (vendedorCodigo === null) return
    setCarregandoClientes(true)
    setClienteCodigo(null)
    setNotas([])
    listarClientesDoVendedor(vendedorCodigo).then((lista) => {
      setClientes(lista)
      setCarregandoClientes(false)
    })
  }, [vendedorCodigo])

  useEffect(() => {
    if (vendedorCodigo === null || clienteCodigo === null) return
    setCarregandoNotas(true)
    Promise.all([
      buscarNotasDoCliente(vendedorCodigo, clienteCodigo),
      buscarPedidosDoCliente(vendedorCodigo, clienteCodigo),
    ]).then(([listaNotas, listaPedidos]) => {
      setNotas(listaNotas)
      setPedidos(listaPedidos)
      setCarregandoNotas(false)
    })
  }, [vendedorCodigo, clienteCodigo])

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return clientes
    return clientes.filter((c) => c.nome.toLowerCase().includes(termo))
  }, [clientes, busca])

  const kpis = useMemo(() => calcularKpis(notas, ANO), [notas])
  const serieMensal = useMemo(() => calcularSerieMensal(notas), [notas])
  const serieAnual = useMemo(() => calcularSerieAnual(notas), [notas])
  const topProdutos = useMemo(() => calcularTopProdutos(notas, ANO, 6, produtosChave), [notas, produtosChave])
  const sazonalidade = useMemo(() => calcularSazonalidade(notas), [notas])
  const insights = useMemo(() => calcularInsights(notas, ANO), [notas])
  const resumoPedidos = useMemo(() => calcularResumoPedidos(pedidos), [pedidos])

  const clienteAtual = clientes.find((c) => c.codigo === clienteCodigo) ?? null

  if (carregandoVendedor) return <SkeletonListaCards />

  if (semVinculo) {
    return (
      <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
        <User className="h-8 w-8 text-white/25" />
        <p className="text-sm font-semibold text-white/60">Sua conta ainda não está vinculada a um código de vendedor.</p>
        <p className="text-xs text-white/40">Peça pro admin vincular pra você ver o BI dos seus clientes.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
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

      <div className="glass flex flex-col gap-2 rounded-2xl p-2.5">
        <div className="flex items-center gap-2 px-1">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setListaAberta(true)}
            placeholder="Buscar cliente…"
            className="w-full flex-1 bg-transparent text-xs font-bold text-white placeholder:text-white/35 outline-none"
          />
          <button
            onClick={() => setListaAberta((v) => !v)}
            aria-label={listaAberta ? 'Fechar lista de clientes' : 'Selecionar da lista de clientes'}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${listaAberta ? 'bg-brand-500 text-ink-950' : 'bg-white/8 text-white/50'}`}
          >
            {listaAberta ? <X className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
          </button>
        </div>
        {(busca || listaAberta) && (
          <div className="flex max-h-64 flex-col overflow-y-auto rounded-xl">
            {carregandoClientes && <p className="p-2 text-center text-[11px] text-white/40">Carregando…</p>}
            {!carregandoClientes && clientesFiltrados.length === 0 && <p className="p-2 text-center text-[11px] text-white/40">Nenhum cliente encontrado</p>}
            {!carregandoClientes && clientesFiltrados.map((c) => (
              <button
                key={c.codigo}
                onClick={() => { setClienteCodigo(c.codigo); setBusca(''); setListaAberta(false) }}
                className={`truncate rounded-lg px-2 py-2.5 text-left text-xs font-semibold transition-colors hover:bg-white/10 ${c.codigo === clienteCodigo ? 'bg-brand-500/15 text-brand-300' : 'text-white/80'}`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {!clienteCodigo && !busca && !listaAberta && vendedorCodigo !== null && (
        <>
          <h2 className="font-display px-1 text-base font-bold">Visão geral</h2>
          <VisaoGeralVendedor vendedorCodigo={vendedorCodigo} onSelecionarCliente={setClienteCodigo} />
        </>
      )}

      {clienteCodigo && carregandoNotas && <SkeletonListaCards />}

      {clienteCodigo && !carregandoNotas && clienteAtual && (
        <>
          <div className="flex items-center gap-2 px-1">
            <h2 className="font-display min-w-0 flex-1 truncate text-base font-bold">{clienteAtual.nome}</h2>
            <button onClick={() => { setClienteCodigo(null); setListaAberta(true) }} className="shrink-0 text-[11px] font-bold text-brand-300">
              Trocar cliente
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="glass flex flex-col gap-1 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Toneladas {ANO}</div>
              <ContadorAnimado valor={kpis.toneladasAno} formatar={fmtT} className="tabular font-display text-lg font-extrabold text-white" />
              {kpis.variacaoToneladasPct !== null && (
                <span className={`text-[10px] font-bold ${kpis.variacaoToneladasPct >= 0 ? 'text-brand-300' : 'text-danger-400'}`}>
                  {fmtPct(kpis.variacaoToneladasPct)} vs {ANO - 1}
                </span>
              )}
            </div>
            <div className="glass flex flex-col gap-1 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Faturado {ANO}</div>
              <ContadorAnimado valor={kpis.reaisAno} formatar={fmtBRL} className="tabular font-display text-lg font-extrabold text-white" />
              {kpis.variacaoReaisPct !== null && (
                <span className={`text-[10px] font-bold ${kpis.variacaoReaisPct >= 0 ? 'text-brand-300' : 'text-danger-400'}`}>
                  {fmtPct(kpis.variacaoReaisPct)} vs {ANO - 1}
                </span>
              )}
            </div>
            <div className="glass flex flex-col gap-1 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Pedidos a faturar</div>
              {resumoPedidos.itens.length > 0 ? (
                <>
                  <ContadorAnimado valor={resumoPedidos.totalValorSaldo} formatar={fmtBRL} className="tabular font-display text-lg font-extrabold text-white" />
                  <span className="text-[10px] font-semibold text-white/35">{fmtT(resumoPedidos.totalSaldoT)} restantes</span>
                </>
              ) : (
                <>
                  <div className="font-display text-lg font-extrabold text-white/25">—</div>
                  <span className="text-[10px] font-semibold text-white/35">Nenhum pedido em aberto</span>
                </>
              )}
            </div>
            <div className="glass flex flex-col gap-1 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Ticket médio/t</div>
              <div className="tabular font-display text-lg font-extrabold text-white">{fmtBRL(kpis.ticketMedioReaisPorTonelada)}</div>
            </div>
          </div>

          {insights.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {insights.map((ins, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1.5 text-[10.5px] font-bold text-white/80">
                  <span>{ins.emoji}</span>
                  {ins.texto}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
            <div className="glass flex flex-col gap-2 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                  <TrendingUp className="h-3.5 w-3.5 text-brand-300" />
                  Últimos 12 meses
                </div>
                <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
                  <button onClick={() => setSerieChave('toneladas')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${serieChave === 'toneladas' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>t</button>
                  <button onClick={() => setSerieChave('reais')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${serieChave === 'reais' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>R$</button>
                </div>
              </div>
              <GraficoBarras
                itens={serieMensal
                  .slice()
                  .reverse()
                  .map((p) => ({ label: NOMES_MES_CURTO[Number(p.mes.slice(5, 7)) - 1], valor: serieChave === 'toneladas' ? p.toneladas : p.reais }))}
                formatarValor={serieChave === 'toneladas' ? fmtT : fmtBRLCompleto}
              />
            </div>

            {serieAnual.length > 1 && (
              <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                  <Calendar className="h-3.5 w-3.5 text-brand-300" />
                  Por ano
                </div>
                <GraficoBarras itens={serieAnual.map((a) => ({ label: String(a.ano), valor: a.toneladas }))} formatarValor={fmtT} />
              </div>
            )}

            {topProdutos.length > 0 && (
              <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                    <Package className="h-3.5 w-3.5 text-brand-300" />
                    Top produtos em {ANO}
                  </div>
                  <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
                    <button onClick={() => setProdutosChave('toneladas')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${produtosChave === 'toneladas' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>t</button>
                    <button onClick={() => setProdutosChave('reais')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${produtosChave === 'reais' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>R$</button>
                  </div>
                </div>
                <GraficoBarras
                  itens={topProdutos.map((p) => ({ label: p.produto, valor: produtosChave === 'toneladas' ? p.toneladas : p.reais }))}
                  formatarValor={produtosChave === 'toneladas' ? fmtT : fmtBRL}
                  cor="#a9835f"
                />
              </div>
            )}

            {resumoPedidos.itens.length > 0 && (
              <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                    <ShoppingCart className="h-3.5 w-3.5 text-brand-300" />
                    Pedidos em aberto
                  </div>
                  <div className="flex gap-1 rounded-lg bg-white/8 p-0.5">
                    <button onClick={() => setPedidosChave('toneladas')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${pedidosChave === 'toneladas' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>t</button>
                    <button onClick={() => setPedidosChave('reais')} className={`rounded-md px-2 py-1 text-[9.5px] font-bold ${pedidosChave === 'reais' ? 'bg-brand-500 text-ink-950' : 'text-white/50'}`}>R$</button>
                  </div>
                </div>
                <PedidoProgresso itens={resumoPedidos.itens} chave={pedidosChave} formatarValor={pedidosChave === 'toneladas' ? fmtT : fmtBRL} />
              </div>
            )}

            <div className="glass flex flex-col gap-3 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Sazonalidade — toneladas por mês (histórico)</div>
              <HeatmapSazonalidade pontos={sazonalidade} />
            </div>
          </div>

          <div className="glass flex flex-col rounded-2xl p-2">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">Notas recentes</div>
            {notas.slice(-8).reverse().map((n, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-2.5 last:border-0">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-white">{n.produto}</div>
                  <div className="text-[10px] text-white/45">{new Date(n.emissao + 'T00:00:00').toLocaleDateString('pt-BR')} · Nota {n.nota || '—'}</div>
                </div>
                <div className="tabular shrink-0 text-xs font-extrabold text-white">{fmtBRLCompleto(n.valorLiquido)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
