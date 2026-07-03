'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertTriangle, Download, Printer, ArrowLeftCircle, CalendarClock, Pencil, X, Share2, ShieldAlert, UserCircle2, ChevronRight, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { calcularCotacao, COMISSAO_BASE_NIVEL } from '@/lib/pricing/calculadora'
import { calcularPrazoMedio, type Parcela } from '@/lib/pricing/prazo-medio'
import { gerarImagemResumo, type ResumoSecao } from '@/lib/pricing/resumo-image'
import { PrazoMedioScreen } from '@/components/cotacao/prazo-medio-screen'
import { ClientePicker } from '@/components/cotacao/cliente-picker'
import { ClienteForm } from '@/components/clientes/cliente-form'
import { criarCliente } from '@/lib/clientes/queries'
import { salvarCotacao } from '@/lib/cotacoes/queries'
import type { Cliente } from '@/lib/clientes/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { FormulaPreco } from '@/lib/pricing/formulas'
import { createClient } from '@/lib/supabase/client'
import { buscarTotalComissao, verificarNovasConquistas } from '@/lib/gamificacao/queries'
import type { Tier } from '@/lib/gamificacao/tiers'
import { ConquistaOverlay } from '@/components/perfil/conquista-overlay'

interface CotacaoScreenProps {
  formulas: FormulaPreco[]
  dataTabela: string
  vendedor: string
}

type Visao = 'form' | 'prazo' | 'resumo' | 'clientes' | 'novoCliente'
type ModoPagamento = 'avista' | 'parcelado'

const ESTADOS = [
  { uf: 'SC', icms: '4,00%' }, { uf: 'MT', icms: '4,00%' }, { uf: 'PR', icms: '0,00%' },
  { uf: 'SP', icms: '4,00%' }, { uf: 'MS', icms: '4,00%' }, { uf: 'RO', icms: '4,00%' },
  { uf: 'OUTRO', icms: '4,00% (padrão)' },
]

function fmtBRL(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtUSD(v: number) { return '$ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtPct(v: number) { return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR') }
function fmtDateInput(iso: string) { return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') }
function toDateInput(d: Date) { return d.toISOString().slice(0, 10) }

function parcelasValidas(parcelas: Parcela[]) {
  return parcelas.filter((p) => p.percentual > 0 && p.data)
}

/** Uma linha por parcela em "Dados da venda" — texto único ficava confuso com várias parcelas. */
function linhasPagamento(modoPagamento: ModoPagamento, pagamentoAvista: string, parcelas: Parcela[]): [string, string][] {
  if (modoPagamento === 'avista') return [['Pagamento', fmtDateInput(pagamentoAvista)]]
  const validas = parcelasValidas(parcelas)
  return validas.map((p, i) => [`Pagamento ${i + 1}/${validas.length} (${fmtPct(p.percentual)})`, fmtDateInput(p.data)])
}

export function CotacaoScreen({ formulas, dataTabela, vendedor }: CotacaoScreenProps) {
  const [visao, setVisao] = useState<Visao>('form')
  const [produto, setProduto] = useState('')
  const [estado, setEstado] = useState('MS')
  const [entrega, setEntrega] = useState(toDateInput(new Date(Date.now() + 60 * 86400000)))
  const [frete, setFrete] = useState('750')
  const [agenciador, setAgenciador] = useState('0')
  const [precoVendido, setPrecoVendido] = useState('')
  const [quantidade, setQuantidade] = useState('50')
  const [dolar, setDolar] = useState<number | null>(null)

  const [modoPagamento, setModoPagamento] = useState<ModoPagamento>('avista')
  const [pagamentoAvista, setPagamentoAvista] = useState(toDateInput(new Date(Date.now() + 300 * 86400000)))
  const [parcelas, setParcelas] = useState<Parcela[]>([])

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salva, setSalva] = useState(false)
  const [novasConquistas, setNovasConquistas] = useState<Tier[]>([])

  useEffect(() => {
    fetch('/api/dolar').then((r) => r.json()).then((d) => setDolar(d.bid)).catch(() => setDolar(5.2))
  }, [])

  const precoBase = useMemo(() => formulas.find((f) => f.nome === produto)?.precoUsdAvista, [formulas, produto])

  const prazoCalc = useMemo(() => calcularPrazoMedio(parcelas, new Date()), [parcelas])

  const pagamentoEfetivo = useMemo(() => {
    if (modoPagamento === 'avista') return pagamentoAvista ? new Date(pagamentoAvista + 'T00:00:00') : null
    return prazoCalc.dataMedia
  }, [modoPagamento, pagamentoAvista, prazoCalc.dataMedia])

  const precoVendidoNum = parseFloat(precoVendido) || 0
  const temPrecoNegociado = precoVendidoNum > 0
  const quantidadeNum = parseFloat(quantidade) || 0

  // Calculado assim que fórmula + datas + dólar estão prontos, mesmo sem preço
  // vendido ainda -- preço de tabela não depende dele, só a comissão depende.
  // Com precoVendido=0 os campos de comissão/aprovado ficam sem sentido, então
  // a UI só os mostra quando `temPrecoNegociado` é true.
  const resultado = useMemo(() => {
    if (!precoBase || !dolar || !entrega || !pagamentoEfetivo) return null

    return calcularCotacao({
      precoAvistaUSD: precoBase,
      estado,
      entrega: new Date(entrega + 'T00:00:00'),
      pagamento: pagamentoEfetivo,
      frete: parseFloat(frete) || 0,
      agenciadorPct: (parseFloat(agenciador) || 0) / 100,
      precoVendido: precoVendidoNum,
      dolarAgora: dolar,
      dataTabela: new Date(dataTabela),
    })
  }, [precoBase, dolar, entrega, pagamentoEfetivo, frete, agenciador, precoVendidoNum, estado, dataTabela])

  const validadeHoje = new Date().toLocaleDateString('pt-BR')

  function montarSecoes(): ResumoSecao[] {
    if (!resultado) return []
    const v = precoVendidoNum
    const precoRows: [string, string][] = [
      ['Preço U$D/tonelada', fmtUSD(v / (dolar ?? 1))],
      ['Preço/tonelada', fmtBRL(v)],
      ['Preço/saca (50kg)', fmtBRL(v / 20)],
      ['Preço/bag (750kg)', fmtBRL(v * 0.75)],
      ['Pedido para entrega', resultado.pedidoEntrega],
    ]
    if (resultado.campanhaAvista !== null) precoRows.push(['Preço campanha à vista', fmtBRL(resultado.campanhaAvista) + '/t'])

    return [
      { title: 'Dados da venda', rows: [
        ...(cliente ? [['Cliente', cliente.nome] as [string, string]] : []),
        ['Produto', produto],
        ['Estado', estado === 'OUTRO' ? '—' : estado],
        ['Data', fmtDate(dataTabela)],
        ['Entrega', fmtDateInput(entrega)],
        ...linhasPagamento(modoPagamento, pagamentoAvista, parcelas),
      ] },
      { title: 'Custos', rows: [
        ['ICMS', resultado.icms > 0 ? 'Incluso' : 'Isento'],
        ['Frete', (parseFloat(frete) || 0) > 0 ? 'CIF' : 'FOB'],
      ] },
      { title: 'Preço', rows: precoRows, destaque: 1 },
    ]
  }

  function gerarImagem() {
    return gerarImagemResumo(montarSecoes(), `Válida somente hoje, ${validadeHoje}`, `vendedor ${vendedor}`)
  }

  function baixarResumo() {
    const a = document.createElement('a')
    a.href = gerarImagem()
    a.download = 'cotacao-fertiflora.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function compartilharWhatsApp() {
    const dataUrl = gerarImagem()
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], 'cotacao-fertiflora.png', { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Cotação FertiFlora' })
        return
      } catch {
        // usuário cancelou o share sheet — não faz nada
        return
      }
    }

    // Sem suporte a compartilhar arquivo (ex.: desktop): abre o WhatsApp Web com um resumo em texto
    const texto = `Cotação FertiFlora — válida somente hoje (${validadeHoje}). Baixe o resumo em imagem e envie por aqui.`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (visao === 'prazo') {
    return (
      <PrazoMedioScreen
        parcelasIniciais={parcelas}
        onCancelar={() => setVisao('form')}
        onConfirmar={(novasParcelas) => {
          setParcelas(novasParcelas)
          setModoPagamento('parcelado')
          setVisao('form')
        }}
      />
    )
  }

  if (visao === 'clientes') {
    return (
      <ClientePicker
        onVoltar={() => setVisao('form')}
        onNovoCliente={() => setVisao('novoCliente')}
        onSelecionar={(c) => { setCliente(c); setVisao('form') }}
      />
    )
  }

  if (visao === 'novoCliente') {
    return (
      <main className="min-h-screen bg-ink-950 pb-16">
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setVisao('clientes')} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <h1 className="font-display text-lg font-bold">Novo Cliente</h1>
          </div>
          <ClienteForm
            onCancelar={() => setVisao('clientes')}
            onSalvar={async (input) => {
              const novo = await criarCliente(input)
              setCliente(novo)
              toast.success('Cliente cadastrado')
              setVisao('form')
            }}
          />
        </div>
      </main>
    )
  }

  async function salvarCotacaoAtual() {
    if (!resultado) return
    setSalvando(true)
    try {
      const comissaoTotal = resultado.projecaoComissao * quantidadeNum
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const totalAntes = user ? await buscarTotalComissao(user.id) : 0

      await salvarCotacao({
        clienteId: cliente?.id ?? null,
        produto,
        precoVendido: precoVendidoNum,
        aprovado: resultado.aprovado,
        quantidadeToneladas: quantidadeNum,
        comissaoTotal,
        dados: {
          estado, entrega, frete, agenciador, modoPagamento, pagamentoAvista, parcelas,
          dolar, precoVendido: precoVendidoNum, secoes: montarSecoes(), validadeGeracao: validadeHoje,
        },
      })
      setSalva(true)
      toast.success('Cotação salva em Cotações válidas')

      if (user && resultado.aprovado) {
        const totalDepois = totalAntes + comissaoTotal
        const novas = await verificarNovasConquistas(user.id, totalAntes, totalDepois)
        if (novas.length > 0) setNovasConquistas(novas)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar cotação')
    } finally {
      setSalvando(false)
    }
  }

  const secoes = visao === 'resumo' ? montarSecoes() : []

  return (
    <main className="min-h-screen bg-ink-950 pb-16">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display text-lg font-bold">Nova Cotação</h1>
          <div className="ml-auto text-right text-[11px] text-white/45">
            Vendedor<b className="block text-xs text-white">{vendedor}</b>
          </div>
        </div>

        <div className="glass flex items-center gap-3 rounded-2xl p-3.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-400 shadow-[0_0_0_0_rgba(24,165,88,0.6)]" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Dólar agora · tempo real</div>
            <div className="tabular text-lg font-extrabold">{dolar ? fmtBRL(dolar) : '—'}</div>
          </div>
        </div>

        {visao === 'form' && (
          <button
            onClick={() => setVisao('clientes')}
            className="glass flex items-center gap-3 rounded-2xl p-3.5 text-left transition-colors hover:bg-white/10"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-earth-tan/20 text-earth-tan">
              <UserCircle2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Cliente</div>
              <div className="truncate text-sm font-bold text-white">{cliente ? cliente.nome : 'Selecionar ou cadastrar cliente'}</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
          </button>
        )}

        {visao !== 'resumo' && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-warning-500/30 bg-warning-500/10 px-3.5 py-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-warning-400" />
            <p className="text-[11.5px] font-semibold leading-snug text-warning-300">
              Cotação válida somente hoje, <span className="tabular">{validadeHoje}</span>
            </p>
          </div>
        )}

        {visao === 'form' && (
          <>
            <div className="glass flex flex-col gap-4 rounded-3xl p-5">
              <h2 className="font-display flex items-center gap-2 text-sm font-bold">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/20 text-[11px] text-brand-300">1</span>
                Produto e condições
              </h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">Fórmula</label>
                <div className="relative">
                  <input
                    list="lista-formulas"
                    value={produto}
                    onChange={(e) => setProduto(e.target.value)}
                    placeholder="Buscar fórmula (ex: 00-08-08)"
                    autoComplete="off"
                    className="w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 pr-11 text-[16px] font-medium text-white outline-none placeholder:text-white/35 focus:border-brand-400 focus:bg-brand-500/10"
                  />
                  {produto && (
                    <button
                      type="button"
                      onClick={() => setProduto('')}
                      aria-label="Limpar fórmula selecionada"
                      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <datalist id="lista-formulas">
                  {formulas.map((f) => <option key={f.nome} value={f.nome} />)}
                </datalist>
                <p className="text-[10.5px] text-white/40">
                  {precoBase !== undefined ? `Referência 100% à vista: ${fmtUSD(precoBase)}/t` : produto ? 'Fórmula não encontrada no catálogo.' : 'Preço de referência aparece aqui.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[16px] font-medium text-white outline-none focus:border-brand-400"
                  >
                    {ESTADOS.map((e) => <option key={e.uf} value={e.uf} className="text-slate-800">{e.uf} — {e.icms}</option>)}
                  </select>
                </div>
                <Input tone="dark" label="Frete (R$)" type="number" min={0} step={10} value={frete} onChange={(e) => setFrete(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input tone="dark" label="Entrega" type="date" value={entrega} onChange={(e) => setEntrega(e.target.value)} />
                <Input tone="dark" label="Quantidade (t)" type="number" min={0} step={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">Pagamento</label>
                <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
                  <button
                    onClick={() => setModoPagamento('avista')}
                    className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', modoPagamento === 'avista' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
                  >
                    Pagamento único
                  </button>
                  <button
                    onClick={() => setVisao('prazo')}
                    className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', modoPagamento === 'parcelado' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
                  >
                    Parcelamento
                  </button>
                </div>

                {modoPagamento === 'avista' && (
                  <input
                    type="date"
                    value={pagamentoAvista}
                    onChange={(e) => setPagamentoAvista(e.target.value)}
                    className="mt-1 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[16px] font-medium text-white outline-none focus:border-brand-400"
                  />
                )}

                {modoPagamento === 'parcelado' && (
                  <button
                    onClick={() => setVisao('prazo')}
                    className="mt-1 flex flex-col gap-2.5 rounded-2xl border border-white/15 bg-white/[0.06] p-4 text-left"
                  >
                    <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-white/40">
                      <CalendarClock className="h-3.5 w-3.5 text-brand-300" />
                      Parcelas combinadas
                      <Pencil className="ml-auto h-3.5 w-3.5 text-white/40" />
                    </div>

                    {parcelasValidas(parcelas).length === 0 && (
                      <span className="text-[13px] font-medium text-white/50">Nenhuma parcela definida ainda</span>
                    )}

                    {parcelasValidas(parcelas).map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.05] px-3 py-2">
                        <span className="tabular text-[13px] font-semibold text-white">{fmtDateInput(p.data)}</span>
                        <span className="tabular text-[13px] font-bold text-brand-300">{fmtPct(p.percentual)}</span>
                      </div>
                    ))}

                    {prazoCalc.dataMedia && (
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-[11.5px]">
                        <span className="text-white/45">Data média de pagamento</span>
                        <span className="tabular font-bold text-white">{prazoCalc.dataMedia.toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </button>
                )}
              </div>

              <Input tone="dark" label="Agenciador (%) · opcional" type="number" min={0} max={100} step={0.5} value={agenciador} onChange={(e) => setAgenciador(e.target.value)} />
            </div>

            <div className="glass flex flex-col gap-4 rounded-3xl p-5">
              <h2 className="font-display flex items-center gap-2 text-sm font-bold">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/20 text-[11px] text-brand-300">2</span>
                Preço negociado
              </h2>
              <Input
                tone="dark"
                label="Preço vendido (R$ por tonelada)"
                type="number"
                min={0}
                step={1}
                placeholder="0,00"
                value={precoVendido}
                onChange={(e) => setPrecoVendido(e.target.value)}
              />
              <p className="text-[10.5px] text-white/40">
                Esse é o valor que você está fechando com o cliente — o sistema calcula ICMS, frete e sua comissão a partir dele.
              </p>
            </div>

            <div className="glass flex flex-col gap-4 rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Preço negociado</div>
                  <div className="tabular text-2xl font-extrabold">
                    {temPrecoNegociado ? fmtBRL(precoVendidoNum) : '—'}<small className="text-sm font-bold text-white/50">/t</small>
                  </div>
                  {resultado && temPrecoNegociado && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-brand-300">
                      🌱 Você ganha {fmtBRL(resultado.projecaoComissao)}<span className="font-medium text-white/45">/t de comissão</span>
                    </div>
                  )}
                  {resultado && temPrecoNegociado && resultado.agenciadorRS > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-earth-tan">
                      🤝 Agenciador ganha {fmtBRL(resultado.agenciadorRS)}<span className="font-medium text-white/45">/t</span>
                    </div>
                  )}
                </div>
                <span className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-extrabold',
                  (!resultado || !temPrecoNegociado) && 'bg-white/10 text-white/50',
                  resultado && temPrecoNegociado && resultado.aprovado && 'bg-brand-500/20 text-brand-300',
                  resultado && temPrecoNegociado && !resultado.aprovado && 'bg-danger-500/20 text-danger-400'
                )}>
                  {!resultado && (modoPagamento === 'parcelado' && !prazoCalc.fechaEm100 ? 'Parcelas não fecham 100%' : 'Preencha os dados')}
                  {resultado && !temPrecoNegociado && 'Informe o preço vendido'}
                  {resultado && temPrecoNegociado && resultado.aprovado && <><CheckCircle2 className="h-3.5 w-3.5" />Aprovado</>}
                  {resultado && temPrecoNegociado && !resultado.aprovado && <><AlertTriangle className="h-3.5 w-3.5" />Reprovado</>}
                </span>
              </div>

              {resultado && temPrecoNegociado && !resultado.aprovado && (
                <div className="rounded-xl border border-danger-500/35 bg-danger-500/15 p-3 text-xs leading-snug text-danger-300">
                  Preço abaixo do mínimo ({fmtBRL(resultado.precoMinimo)}/t). Entre em contato com a diretoria para aprovar essa condição.
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="ICMS" value={resultado ? fmtPct(resultado.icms) : '—'} />
                <MiniStat label="Condição" value={resultado ? (resultado.eAVista ? 'À vista' : 'Prazo') : '—'} />
                <MiniStat label="Mínimo" value={resultado ? fmtBRL(resultado.precoMinimo) : '—'} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Saca 50kg" value={resultado ? fmtBRL(resultado.precoSaca) : '—'} />
                <MiniStat label="Bag 750kg" value={resultado ? fmtBRL(resultado.precoBag) : '—'} />
                <MiniStat label="Em US$/t" value={resultado ? fmtUSD(resultado.precoUsd) : '—'} />
              </div>

              {resultado && (
                <div className="flex items-center justify-between rounded-xl bg-brand-500/10 px-3.5 py-2.5">
                  <span className="text-xs font-bold text-brand-300">Preço sugerido</span>
                  <span className="tabular text-sm font-extrabold text-brand-300">{fmtBRL(resultado.precoTabela)}/t</span>
                </div>
              )}

              {resultado?.campanhaAvista != null && (
                <div className="flex items-center justify-between rounded-xl bg-earth-tan/10 px-3.5 py-2.5">
                  <span className="text-xs font-bold text-earth-tan">Preço campanha à vista</span>
                  <span className="tabular text-sm font-extrabold text-earth-tan">{fmtBRL(resultado.campanhaAvista)}/t</span>
                </div>
              )}

              {temPrecoNegociado && (
                <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                  <div className="flex justify-between text-xs font-bold text-white/60">
                    <span>Sua comissão (interno)</span>
                    <span>{resultado ? fmtPct(resultado.comissaoCalculada) : '—'}</span>
                  </div>
                  <CommRow label="Base" value={fmtPct(COMISSAO_BASE_NIVEL)} />
                  <CommRow label="Bônus 100% à vista" value={resultado ? `${resultado.bonusAvista >= 0 ? '+' : ''}${fmtPct(resultado.bonusAvista)}` : '—'} />
                  <CommRow label={resultado && resultado.bonusPorPreco < 0 ? 'Desconto por preço' : 'Bônus por preço'} value={resultado ? `${resultado.bonusPorPreco >= 0 ? '+' : ''}${fmtPct(resultado.bonusPorPreco)}` : '—'} />
                  <CommRow label="Ajuste agenciador" value={resultado ? `${resultado.ajusteAgenciador >= 0 ? '+' : ''}${fmtPct(resultado.ajusteAgenciador)}` : '—'} />
                  <div className="flex items-baseline justify-between border-t border-dashed border-white/15 pt-2">
                    <span className="text-xs font-bold">Projeção por tonelada</span>
                    <span className="tabular text-lg font-extrabold text-brand-300">
                      {resultado ? fmtBRL(resultado.projecaoComissao) : '—'}<small className="text-[11px] font-bold text-white/50">/t</small>
                    </span>
                  </div>
                </div>
              )}

              <Button disabled={!resultado || !temPrecoNegociado} onClick={() => setVisao('resumo')}>Gerar resumo para o cliente</Button>
            </div>
          </>
        )}

        {visao === 'resumo' && resultado && (
          <div className="glass-light flex flex-col gap-4 rounded-[28px] p-6">
            <div className="flex flex-col items-center gap-1 border-b border-slate-800/10 pb-4 text-center">
              <div className="font-display text-base font-bold text-brand-700">🌱 FertiFlora</div>
              <div className="text-xs text-slate-800/55">Resumo da cotação</div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-warning-500/15 px-3.5 py-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 text-warning-600" />
              <p className="text-[12px] font-bold leading-snug text-warning-600">
                Cotação válida somente hoje, <span className="tabular">{validadeHoje}</span>
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {secoes.map((sec) => (
                <div key={sec.title} className="flex flex-col">
                  <div className="mb-1 rounded-lg bg-gradient-to-r from-brand-200 to-brand-500 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-950">
                    {sec.title}
                  </div>
                  {sec.rows.map((row, i) => (
                    <div key={row[0]} className={cn('flex justify-between gap-3 border-b border-slate-800/10 py-2.5 text-[13px]', sec.destaque === i && 'py-3')}>
                      <span className={sec.destaque === i ? 'font-bold text-slate-800' : 'text-slate-800/60'}>{row[0]}</span>
                      <span className={cn('tabular text-right font-bold', sec.destaque === i ? 'text-[16px] text-brand-700' : 'text-slate-800')}>{row[1]}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <Button onClick={compartilharWhatsApp}><Share2 className="h-4 w-4" />Compartilhar com o cliente</Button>
            <Button variant="ghost" onClick={baixarResumo}><Download className="h-4 w-4" />Baixar resumo</Button>
            <Button variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" />Imprimir</Button>
            <Button variant="ghost" disabled={salvando || salva} onClick={salvarCotacaoAtual}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {salva ? 'Cotação salva' : 'Salvar cotação'}
            </Button>
            <Button variant="ghost" onClick={() => setVisao('form')}><ArrowLeftCircle className="h-4 w-4" />Voltar e ajustar</Button>
          </div>
        )}
      </div>

      {novasConquistas.length > 0 && (
        <ConquistaOverlay tiers={novasConquistas} onFechar={() => setNovasConquistas([])} />
      )}
    </main>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-2.5">
      <div className="text-[9.5px] font-semibold uppercase tracking-wide text-white/40">{label}</div>
      <div className="tabular mt-0.5 text-[13.5px] font-extrabold">{value}</div>
    </div>
  )
}

function CommRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-white/60">
      <span>{label}</span>
      <b className="tabular text-white">{value}</b>
    </div>
  )
}
