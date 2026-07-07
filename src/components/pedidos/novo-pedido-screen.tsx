'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, Loader2, Package, Search, Send, UserCircle2 } from 'lucide-react'
import { listarCotacoes } from '@/lib/cotacoes/queries'
import { statusCotacao, type CotacaoSalva } from '@/lib/cotacoes/types'
import { listarClientes } from '@/lib/clientes/queries'
import type { Cliente } from '@/lib/clientes/types'
import { buscarPerfil } from '@/lib/perfil/queries'
import { criarPedido, solicitarAprovacao } from '@/lib/pedidos/queries'
import { baixarContratoPdf } from '@/lib/pedidos/contrato-pdf'
import { EMBALAGENS, calcularPedido, type Embalagem, type Pedido, type PedidoDados } from '@/lib/pedidos/types'
import { ClientePicker } from '@/components/cotacao/cliente-picker'
import { ClienteForm } from '@/components/clientes/cliente-form'
import { criarCliente } from '@/lib/clientes/queries'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { SkeletonListaCards } from '@/components/ui/skeleton'

function fmtBRL(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Visao = 'selecionar' | 'form' | 'cliente' | 'novoCliente' | 'gerado'

export function NovoPedidoScreen({ userId }: { userId: string }) {
  usePageIntensity(0.2)
  const [visao, setVisao] = useState<Visao>('selecionar')
  const [cotacoes, setCotacoes] = useState<CotacaoSalva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [clientesPorId, setClientesPorId] = useState<Record<string, Cliente>>({})

  const [cotacaoSelecionada, setCotacaoSelecionada] = useState<CotacaoSalva | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [quantidade, setQuantidade] = useState('')
  const [embalagem, setEmbalagem] = useState<Embalagem>('bag_750kg')
  const [salvando, setSalvando] = useState(false)
  const [pedidoGerado, setPedidoGerado] = useState<Pedido | null>(null)
  const [solicitando, setSolicitando] = useState(false)
  const [solicitado, setSolicitado] = useState(false)

  useEffect(() => {
    Promise.all([listarCotacoes(), listarClientes()]).then(([cots, clis]) => {
      // Cotações abaixo do mínimo continuam selecionáveis — o aviso aparece
      // na lista, no formulário e no pedido até a análise de crédito decidir.
      setCotacoes(cots.filter((c) => statusCotacao(c.createdAt) === 'valida'))
      setClientesPorId(Object.fromEntries(clis.map((c) => [c.id, c])))
      setCarregando(false)
    })
  }, [])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return cotacoes
    return cotacoes.filter((c) => c.produto.toLowerCase().includes(termo))
  }, [cotacoes, busca])

  function selecionarCotacao(c: CotacaoSalva) {
    setCotacaoSelecionada(c)
    setQuantidade(String(c.quantidadeToneladas))
    setCliente(c.clienteId ? clientesPorId[c.clienteId] ?? null : null)
    setVisao(c.clienteId && clientesPorId[c.clienteId] ? 'form' : 'cliente')
  }

  const quantidadeNum = parseFloat(quantidade) || 0
  const calculo = cotacaoSelecionada ? calcularPedido(quantidadeNum, embalagem, cotacaoSelecionada.precoVendido, parseFloat(cotacaoSelecionada.dados.frete) || 0) : null

  async function gerarPdf() {
    if (!cotacaoSelecionada || !cliente || quantidadeNum <= 0) return
    setSalvando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada — faça login novamente.')
      const perfil = await buscarPerfil(user.id, userId)

      const dados: PedidoDados = {
        clienteNome: cliente.nome,
        clienteCpfCnpj: cliente.cpfCnpj,
        clienteInscricaoEstadual: cliente.inscricaoEstadual,
        clienteEndereco: [cliente.logradouro, cliente.numero, cliente.bairro].filter(Boolean).join(', '),
        clienteCidade: cliente.cidade,
        clienteEstado: cliente.estado,
        clienteCep: cliente.cep,
        clienteEmail: cliente.email,
        clienteTelefone: cliente.telefone,
        vendedorNome: perfil.nomeCompleto || perfil.apelido || perfil.username,
        vendedorTelefone: perfil.telefone,
        produto: cotacaoSelecionada.produto,
        precoVendidoTon: cotacaoSelecionada.precoVendido,
        freteTon: parseFloat(cotacaoSelecionada.dados.frete) || 0,
        vencimento: cotacaoSelecionada.dados.dataComissao,
        dolar: cotacaoSelecionada.dados.dolar,
        comissaoPct: cotacaoSelecionada.dados.comissaoPct ?? null,
        agenciadorPct: cotacaoSelecionada.dados.agenciadorPct ?? null,
        abaixoDoMinimo: !cotacaoSelecionada.aprovado,
      }

      const pedido = await criarPedido({
        clienteId: cliente.id,
        cotacaoId: cotacaoSelecionada.id,
        quantidadeToneladas: quantidadeNum,
        embalagem,
        dados,
      })

      setPedidoGerado(pedido)
      await baixarContratoPdf(pedido)
      toast.success('Contrato gerado e baixado')
      setVisao('gerado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao gerar contrato')
    } finally {
      setSalvando(false)
    }
  }

  async function handleSolicitarAprovacao() {
    if (!pedidoGerado) return
    setSolicitando(true)
    try {
      await solicitarAprovacao(pedidoGerado.id)
      setSolicitado(true)
      toast.success('Aprovação solicitada ao Admin')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao solicitar aprovação')
    } finally {
      setSolicitando(false)
    }
  }

  if (visao === 'cliente') {
    return (
      <ClientePicker
        onVoltar={() => setVisao('selecionar')}
        onNovoCliente={() => setVisao('novoCliente')}
        onSelecionar={(c) => { setCliente(c); setVisao('form') }}
      />
    )
  }

  if (visao === 'novoCliente') {
    return (
      <main className="relative z-10 min-h-screen pb-28">
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setVisao('cliente')} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <h1 className="font-display text-lg font-bold">Novo Cliente</h1>
          </div>
          <ClienteForm
            onCancelar={() => setVisao('cliente')}
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

  if (visao === 'selecionar') {
    return (
      <main className="relative z-10 min-h-screen pb-28">
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
          <div className="flex items-center gap-3">
            <Link href="/pedidos" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <h1 className="font-display text-lg font-bold">Novo Pedido</h1>
          </div>

          <p className="px-1 text-[11px] text-white/45">Selecione uma cotação válida para gerar o contrato de venda.</p>

          <div className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3">
            <Search className="h-4 w-4 text-white/50" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por fórmula"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45"
            />
          </div>

          {carregando && <SkeletonListaCards />}
          {!carregando && filtradas.length === 0 && (
            <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
              <FileText className="h-8 w-8 text-white/25" />
              <p className="text-sm font-semibold text-white/60">Nenhuma cotação válida disponível</p>
              <Link href="/cotacao" className="text-xs font-bold text-brand-300">Criar uma cotação</Link>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {filtradas.map((c) => {
              const cli = c.clienteId ? clientesPorId[c.clienteId] : null
              return (
                <button
                  key={c.id}
                  onClick={() => selecionarCotacao(c)}
                  className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-white/10"
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', c.aprovado ? 'bg-brand-500/15 text-brand-300' : 'bg-warning-500/15 text-warning-400')}>
                    {c.aprovado ? <CheckCircle2 className="h-4.5 w-4.5" /> : <AlertTriangle className="h-4.5 w-4.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{c.produto}</div>
                    <div className="truncate text-xs text-white/45">{cli ? cli.nome : 'Sem cliente vinculado'} · {new Date(c.createdAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div className="tabular shrink-0 text-sm font-extrabold text-white">{fmtBRL(c.precoVendido)}/t</div>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    )
  }

  if (visao === 'gerado' && pedidoGerado) {
    return (
      <main className="relative z-10 min-h-screen pb-28">
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
          <div className="flex items-center gap-3">
            <Link href="/pedidos" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <h1 className="font-display text-lg font-bold">Contrato gerado</h1>
          </div>

          <div className="glass flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="font-display text-base font-bold">Contrato de {cliente?.nome}</h2>
            <p className="text-sm text-white/55">O PDF já foi baixado. Confira os dados antes de solicitar aprovação.</p>
          </div>

          <Button variant="ghost" onClick={() => { void baixarContratoPdf(pedidoGerado) }}><Download className="h-4 w-4" />Baixar novamente</Button>
          <Button disabled={solicitando || solicitado} onClick={handleSolicitarAprovacao}>
            {solicitando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {solicitado ? 'Aprovação solicitada' : 'Solicitar aprovação'}
          </Button>
          <Link href="/pedidos" className="text-center text-xs font-bold text-white/50">Ver meus pedidos</Link>
        </div>
      </main>
    )
  }

  // form
  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setVisao('selecionar')} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display text-lg font-bold">Novo Pedido</h1>
        </div>

        {cotacaoSelecionada && (
          <div className="glass flex flex-col gap-1 rounded-2xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Cotação selecionada</div>
            <div className="text-sm font-bold text-white">{cotacaoSelecionada.produto}</div>
            <div className="tabular text-xs text-white/50">{fmtBRL(cotacaoSelecionada.precoVendido)}/t</div>
          </div>
        )}

        {cotacaoSelecionada && !cotacaoSelecionada.aprovado && (
          <div className="flex items-start gap-2 rounded-xl border border-warning-500/35 bg-warning-500/15 p-3 text-xs leading-snug text-warning-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Preço abaixo do mínimo — o pedido pode ser gerado normalmente, mas vai levar um aviso até a análise de crédito decidir.
          </div>
        )}

        <button onClick={() => setVisao('cliente')} className="glass flex items-center gap-3 rounded-2xl p-3.5 text-left transition-colors hover:bg-white/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-earth-tan/20 text-earth-tan">
            <UserCircle2 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Cliente</div>
            <div className="truncate text-sm font-bold text-white">{cliente ? cliente.nome : 'Selecionar cliente'}</div>
          </div>
        </button>

        <div className="glass flex flex-col gap-4 rounded-3xl p-5">
          <Input tone="dark" label="Quantidade (toneladas)" type="number" min={0} step={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-white/50">Embalagem</label>
            <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
              {EMBALAGENS.map((e) => (
                <button
                  key={e.valor}
                  onClick={() => setEmbalagem(e.valor)}
                  className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', embalagem === e.valor ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
                >
                  {e.rotulo}
                </button>
              ))}
            </div>
          </div>

          {calculo && quantidadeNum > 0 && (
            <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-white/50">
                <Package className="h-3.5 w-3.5 text-brand-300" />
                Resumo do contrato
              </div>
              <MiniRow label="Quantidade de unidades" value={calculo.quantidadeUnidades.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} />
              <MiniRow label="Preço unitário" value={fmtBRL(calculo.precoUnitario)} />
              <MiniRow label="Valor do produto" value={fmtBRL(calculo.valorTotalProduto)} />
              <MiniRow label="Valor do frete" value={fmtBRL(calculo.freteTotal)} />
              <div className="flex items-baseline justify-between border-t border-dashed border-white/15 pt-2">
                <span className="text-xs font-bold">Valor total do pedido</span>
                <span className="tabular text-lg font-extrabold text-brand-300">{fmtBRL(calculo.valorTotalPedido)}</span>
              </div>
            </div>
          )}

          <Button disabled={!cliente || quantidadeNum <= 0 || salvando} onClick={gerarPdf}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Gerar PDF do contrato
          </Button>
        </div>
      </div>
    </main>
  )
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-white/60">
      <span>{label}</span>
      <b className="tabular text-white">{value}</b>
    </div>
  )
}
