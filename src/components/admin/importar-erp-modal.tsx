'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, FileUp, Loader2, Upload, X } from 'lucide-react'
import { lerArquivoErp, parseComissoesErp, parseNotasFiscais, parsePedidosErp, parseRelatorioErp, type ComissaoErpLinha, type LinhaImportada, type NotaFiscalLinha, type PedidoErpLinha } from '@/lib/ranking/importar-erp'
import { atualizarFaturadoImportado } from '@/lib/ranking/queries'
import { substituirNotasFiscais, substituirPedidosErp } from '@/lib/clientes-bi/queries'
import { substituirComissoesErp, substituirComissoesLiquidadasErp } from '@/lib/comissoes/queries'
import type { VendedorComercial } from '@/lib/ranking/types'
import { Button } from '@/components/ui/button'
import { fmtT } from '@/components/ranking/formatadores'
import { cn } from '@/lib/utils/cn'

interface LinhaAtual {
  vendedor: VendedorComercial
  faturado: number
}

interface ImportarErpModalProps {
  linhasAtuais: LinhaAtual[]
  ano: number
  onFechar: () => void
  onImportado: () => void
}

interface Comparacao {
  vendedor: VendedorComercial
  faturadoAtual: number
  faturadoErp: number
}

export function ImportarErpModal({ linhasAtuais, ano, onFechar, onImportado }: ImportarErpModalProps) {
  const [lendo, setLendo] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [comparacoes, setComparacoes] = useState<Comparacao[] | null>(null)
  const [naoEncontrados, setNaoEncontrados] = useState<LinhaImportada[]>([])
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscalLinha[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [pedidosLendo, setPedidosLendo] = useState(false)
  const [pedidosAplicando, setPedidosAplicando] = useState(false)
  const [pedidosErp, setPedidosErp] = useState<PedidoErpLinha[] | null>(null)
  const [pedidosErro, setPedidosErro] = useState<string | null>(null)

  const [comissoesLendo, setComissoesLendo] = useState(false)
  const [comissoesAplicando, setComissoesAplicando] = useState(false)
  const [comissoesErp, setComissoesErp] = useState<ComissaoErpLinha[] | null>(null)
  const [comissoesErro, setComissoesErro] = useState<string | null>(null)

  const [comissoesLiquidadasLendo, setComissoesLiquidadasLendo] = useState(false)
  const [comissoesLiquidadasAplicando, setComissoesLiquidadasAplicando] = useState(false)
  const [comissoesLiquidadasErp, setComissoesLiquidadasErp] = useState<ComissaoErpLinha[] | null>(null)
  const [comissoesLiquidadasErro, setComissoesLiquidadasErro] = useState<string | null>(null)

  async function handleArquivo(file: File) {
    setLendo(true)
    setErro(null)
    try {
      const texto = await lerArquivoErp(file)
      const linhasErp = parseRelatorioErp(texto, ano)
      const erpPorCodigo = new Map(linhasErp.map((l) => [l.codigo, l]))

      const encontrados: Comparacao[] = []
      for (const { vendedor, faturado } of linhasAtuais) {
        const erp = erpPorCodigo.get(vendedor.codigo)
        if (erp) {
          encontrados.push({ vendedor, faturadoAtual: faturado, faturadoErp: erp.toneladas })
          erpPorCodigo.delete(vendedor.codigo)
        }
      }
      setComparacoes(encontrados)
      setNaoEncontrados([...erpPorCodigo.values()])
      setNotasFiscais(parseNotasFiscais(texto))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao ler o arquivo')
    } finally {
      setLendo(false)
    }
  }

  async function handleConfirmar() {
    if (!comparacoes) return
    setAplicando(true)
    try {
      await Promise.all([
        ...comparacoes
          .filter((c) => c.faturadoErp !== c.faturadoAtual)
          .map((c) => atualizarFaturadoImportado(c.vendedor.id, ano, c.faturadoErp)),
        notasFiscais ? substituirNotasFiscais(notasFiscais) : Promise.resolve(),
      ])
      toast.success('Faturado e BI de clientes atualizados a partir do ERP')
      onImportado()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao aplicar importação')
    } finally {
      setAplicando(false)
    }
  }

  const clientesUnicos = notasFiscais ? new Set(notasFiscais.map((n) => `${n.vendedorCodigo}-${n.clienteCodigo}`)).size : 0

  async function handleArquivoPedidos(file: File) {
    setPedidosLendo(true)
    setPedidosErro(null)
    try {
      const texto = await lerArquivoErp(file)
      setPedidosErp(parsePedidosErp(texto))
    } catch (e) {
      setPedidosErro(e instanceof Error ? e.message : 'Falha ao ler o arquivo')
    } finally {
      setPedidosLendo(false)
    }
  }

  async function handleConfirmarPedidos() {
    if (!pedidosErp) return
    setPedidosAplicando(true)
    try {
      await substituirPedidosErp(pedidosErp)
      toast.success('Pedidos em aberto atualizados no BI de clientes')
      onImportado()
      setPedidosErp(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao aplicar importação')
    } finally {
      setPedidosAplicando(false)
    }
  }

  const clientesPedidosUnicos = pedidosErp ? new Set(pedidosErp.map((p) => `${p.vendedorCodigo}-${p.clienteCodigo}`)).size : 0

  async function handleArquivoComissoes(file: File) {
    setComissoesLendo(true)
    setComissoesErro(null)
    try {
      const texto = await lerArquivoErp(file)
      setComissoesErp(parseComissoesErp(texto))
    } catch (e) {
      setComissoesErro(e instanceof Error ? e.message : 'Falha ao ler o arquivo')
    } finally {
      setComissoesLendo(false)
    }
  }

  async function handleConfirmarComissoes() {
    if (!comissoesErp) return
    setComissoesAplicando(true)
    try {
      await substituirComissoesErp(comissoesErp)
      toast.success('Comissões atualizadas')
      onImportado()
      setComissoesErp(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao aplicar importação')
    } finally {
      setComissoesAplicando(false)
    }
  }

  const vendedoresComissoesUnicos = comissoesErp ? new Set(comissoesErp.map((c) => c.vendedorCodigo)).size : 0

  async function handleArquivoComissoesLiquidadas(file: File) {
    setComissoesLiquidadasLendo(true)
    setComissoesLiquidadasErro(null)
    try {
      const texto = await lerArquivoErp(file)
      setComissoesLiquidadasErp(parseComissoesErp(texto))
    } catch (e) {
      setComissoesLiquidadasErro(e instanceof Error ? e.message : 'Falha ao ler o arquivo')
    } finally {
      setComissoesLiquidadasLendo(false)
    }
  }

  async function handleConfirmarComissoesLiquidadas() {
    if (!comissoesLiquidadasErp) return
    setComissoesLiquidadasAplicando(true)
    try {
      await substituirComissoesLiquidadasErp(comissoesLiquidadasErp)
      toast.success('Comissões liquidadas atualizadas')
      onImportado()
      setComissoesLiquidadasErp(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao aplicar importação')
    } finally {
      setComissoesLiquidadasAplicando(false)
    }
  }

  const vendedoresComissoesLiquidadasUnicos = comissoesLiquidadasErp ? new Set(comissoesLiquidadasErp.map((c) => c.vendedorCodigo)).size : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onFechar}>
      <div
        className="glass flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] p-6 sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">Importar relatório do ERP</h2>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!comparacoes && (
          <>
            <p className="text-xs text-white/50">
              Selecione o CSV do relatório RFT6 (Faturamento por Cliente/Produto) exportado do ERP. Atualizo o Faturado de {ano} no Ranking e o histórico completo usado no BI do Cliente (dentro de Carteira de Clientes).
            </p>
            <label className="glass flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 p-8 text-center transition-colors hover:bg-white/10">
              {lendo ? <Loader2 className="h-6 w-6 animate-spin text-brand-300" /> : <FileUp className="h-6 w-6 text-brand-300" />}
              <span className="text-xs font-bold text-white/70">{lendo ? 'Lendo arquivo…' : 'Toque para escolher o arquivo .CSV'}</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                disabled={lendo}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArquivo(f) }}
              />
            </label>
            {erro && <p className="text-xs font-semibold text-danger-400">{erro}</p>}
          </>
        )}

        {comparacoes && (
          <>
            <div className="flex flex-col gap-2">
              {comparacoes.map((c) => {
                const mudou = c.faturadoErp !== c.faturadoAtual
                return (
                  <div key={c.vendedor.id} className={cn('flex items-center justify-between gap-2 rounded-xl px-3 py-2', mudou ? 'bg-brand-500/10' : 'bg-white/5')}>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{c.vendedor.nome}</span>
                    <span className="tabular text-[11px] text-white/40">{fmtT(c.faturadoAtual)}</span>
                    {mudou && (
                      <>
                        <span className="text-white/30">→</span>
                        <span className="tabular text-xs font-extrabold text-brand-300">{fmtT(c.faturadoErp)}</span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {naoEncontrados.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-2xl border border-warning-500/25 bg-warning-500/10 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-warning-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {naoEncontrados.length} código(s) do ERP sem vendedor no Ranking
                </div>
                <p className="text-[10.5px] text-white/50">
                  {naoEncontrados.map((l) => `${l.codigo} - ${l.nomeErp} (${fmtT(l.toneladas)})`).join(' · ')}
                </p>
              </div>
            )}

            {notasFiscais && (
              <p className="text-center text-[10.5px] text-white/40">
                {notasFiscais.length.toLocaleString('pt-BR')} notas · {clientesUnicos.toLocaleString('pt-BR')} clientes serão atualizados no BI
              </p>
            )}

            <Button onClick={handleConfirmar} disabled={aplicando}>
              {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Aplicar {comparacoes.filter((c) => c.faturadoErp !== c.faturadoAtual).length} atualização(ões) + BI
            </Button>
          </>
        )}

        <div className="my-1 h-px bg-white/10" />

        <div className="flex flex-col gap-3">
          <p className="text-xs text-white/50">
            Selecione o CSV do relatório de Pedidos de Vendas (VPE — pedidos em aberto) exportado do ERP. Atualizo o que cada cliente ainda tem pra carregar no BI de clientes.
          </p>

          {!pedidosErp && (
            <>
              <label className="glass flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 p-6 text-center transition-colors hover:bg-white/10">
                {pedidosLendo ? <Loader2 className="h-6 w-6 animate-spin text-brand-300" /> : <FileUp className="h-6 w-6 text-brand-300" />}
                <span className="text-xs font-bold text-white/70">{pedidosLendo ? 'Lendo arquivo…' : 'Toque para escolher o arquivo .CSV'}</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={pedidosLendo}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArquivoPedidos(f) }}
                />
              </label>
              {pedidosErro && <p className="text-xs font-semibold text-danger-400">{pedidosErro}</p>}
            </>
          )}

          {pedidosErp && (
            <>
              <p className="text-center text-[10.5px] text-white/40">
                {pedidosErp.length.toLocaleString('pt-BR')} pedidos em aberto · {clientesPedidosUnicos.toLocaleString('pt-BR')} clientes serão atualizados no BI
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPedidosErp(null)} className="w-auto flex-1" disabled={pedidosAplicando}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmarPedidos} disabled={pedidosAplicando} className="w-auto flex-1">
                  {pedidosAplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Aplicar
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="my-1 h-px bg-white/10" />

        <div className="flex flex-col gap-3">
          <p className="text-xs text-white/50">
            Selecione o CSV do Relatório de Comissionados (RFT159) — versão &quot;geral&quot; (vencimentos e notas lançadas). Atualizo &quot;A pagar&quot; e a projeção na tela &quot;Minhas Comissões&quot;.
          </p>

          {!comissoesErp && (
            <>
              <label className="glass flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 p-6 text-center transition-colors hover:bg-white/10">
                {comissoesLendo ? <Loader2 className="h-6 w-6 animate-spin text-brand-300" /> : <FileUp className="h-6 w-6 text-brand-300" />}
                <span className="text-xs font-bold text-white/70">{comissoesLendo ? 'Lendo arquivo…' : 'Toque para escolher o arquivo .CSV'}</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={comissoesLendo}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArquivoComissoes(f) }}
                />
              </label>
              {comissoesErro && <p className="text-xs font-semibold text-danger-400">{comissoesErro}</p>}
            </>
          )}

          {comissoesErp && (
            <>
              <p className="text-center text-[10.5px] text-white/40">
                {comissoesErp.length.toLocaleString('pt-BR')} linhas de comissão · {vendedoresComissoesUnicos.toLocaleString('pt-BR')} vendedores serão atualizados
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setComissoesErp(null)} className="w-auto flex-1" disabled={comissoesAplicando}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmarComissoes} disabled={comissoesAplicando} className="w-auto flex-1">
                  {comissoesAplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Aplicar
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="my-1 h-px bg-white/10" />

        <div className="flex flex-col gap-3">
          <p className="text-xs text-white/50">
            Selecione o CSV do Relatório de Comissionados (RFT159) — versão &quot;liquidados&quot; (só linhas já pagas pelo cliente, com data de pagamento). Atualizo &quot;Já liquidada&quot; na tela &quot;Minhas Comissões&quot;.
          </p>

          {!comissoesLiquidadasErp && (
            <>
              <label className="glass flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 p-6 text-center transition-colors hover:bg-white/10">
                {comissoesLiquidadasLendo ? <Loader2 className="h-6 w-6 animate-spin text-brand-300" /> : <FileUp className="h-6 w-6 text-brand-300" />}
                <span className="text-xs font-bold text-white/70">{comissoesLiquidadasLendo ? 'Lendo arquivo…' : 'Toque para escolher o arquivo .CSV'}</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={comissoesLiquidadasLendo}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArquivoComissoesLiquidadas(f) }}
                />
              </label>
              {comissoesLiquidadasErro && <p className="text-xs font-semibold text-danger-400">{comissoesLiquidadasErro}</p>}
            </>
          )}

          {comissoesLiquidadasErp && (
            <>
              <p className="text-center text-[10.5px] text-white/40">
                {comissoesLiquidadasErp.length.toLocaleString('pt-BR')} linhas liquidadas · {vendedoresComissoesLiquidadasUnicos.toLocaleString('pt-BR')} vendedores serão atualizados
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setComissoesLiquidadasErp(null)} className="w-auto flex-1" disabled={comissoesLiquidadasAplicando}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmarComissoesLiquidadas} disabled={comissoesLiquidadasAplicando} className="w-auto flex-1">
                  {comissoesLiquidadasAplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Aplicar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
