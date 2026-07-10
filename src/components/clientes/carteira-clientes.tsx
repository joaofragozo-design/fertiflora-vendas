'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, UserPlus, Users } from 'lucide-react'
import { listarClientes, inscreverClientesEmTempoReal } from '@/lib/clientes/queries'
import type { Cliente } from '@/lib/clientes/types'
import { buscarVendedorComercialDoUsuario } from '@/lib/ranking/queries'
import { listarClientesDoVendedor } from '@/lib/clientes-bi/queries'
import { ClienteHistorico } from '@/components/clientes/cliente-historico'
import { BiClienteScreen } from '@/components/clientes-bi/bi-cliente-screen'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { formatarCpfCnpj } from '@/lib/utils/formatadores'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'

type Aba = 'lista' | 'bi'

/** Cadastro completo (tabela `clientes`, dados de NF) ou só um nome+código vindo do ERP (já comprou, nunca foi cadastrado pra emitir nota). */
type ItemLista = { tipo: 'cadastrado'; cliente: Cliente } | { tipo: 'erp'; codigo: number; nome: string }

function nomeDe(item: ItemLista): string {
  return item.tipo === 'cadastrado' ? item.cliente.nome : item.nome
}

export function CarteiraClientes({ userId, ehAdmin }: { userId: string; ehAdmin: boolean }) {
  usePageIntensity(0.2)
  const [itens, setItens] = useState<ItemLista[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<Cliente | null>(null)
  const [aba, setAba] = useState<Aba>('lista')

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const [cadastrados, vendedor] = await Promise.all([
        listarClientes(),
        ehAdmin ? Promise.resolve(null) : buscarVendedorComercialDoUsuario(userId),
      ])
      const erp = vendedor ? await listarClientesDoVendedor(vendedor.codigo) : []

      const nomesCadastrados = new Set(cadastrados.map((c) => c.nome.trim().toLowerCase()))
      const combinados: ItemLista[] = cadastrados.map((c) => ({ tipo: 'cadastrado' as const, cliente: c }))
      for (const e of erp) {
        if (nomesCadastrados.has(e.nome.trim().toLowerCase())) continue
        combinados.push({ tipo: 'erp' as const, codigo: e.codigo, nome: e.nome })
      }
      combinados.sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), 'pt-BR'))

      if (ativo) { setItens(combinados); setCarregando(false) }
    }
    carregar()
    const parar = inscreverClientesEmTempoReal(carregar)
    return () => { ativo = false; parar() }
  }, [userId, ehAdmin])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return itens
    return itens.filter((i) => nomeDe(i).toLowerCase().includes(termo) || (i.tipo === 'cadastrado' && i.cliente.cpfCnpj.includes(termo)))
  }, [itens, busca])

  if (selecionado) {
    return <ClienteHistorico cliente={selecionado} onVoltar={() => setSelecionado(null)} />
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className={cn('mx-auto flex flex-col gap-4 p-4 pt-6', aba === 'bi' ? 'max-w-md lg:max-w-5xl' : 'max-w-md')}>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-bold">Carteira de Clientes</h1>
          <Link
            href="/clientes/novo"
            aria-label="Cadastrar cliente"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-ink-950 transition-transform active:scale-90"
          >
            <Plus className="h-4.5 w-4.5" />
          </Link>
        </div>

        <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
          <button
            onClick={() => setAba('lista')}
            className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'lista' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            Lista
          </button>
          <button
            onClick={() => setAba('bi')}
            className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', aba === 'bi' ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            BI
          </button>
        </div>

        {aba === 'bi' && <BiClienteScreen userId={userId} ehAdmin={ehAdmin} />}

        {aba === 'lista' && (
          <>
            <div className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3">
              <Search className="h-4 w-4 text-white/50" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou CPF/CNPJ"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45"
              />
            </div>

            {carregando && <SkeletonListaCards />}

            {!carregando && filtrados.length === 0 && (
              <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
                <Users className="h-8 w-8 text-white/25" />
                <p className="text-sm font-semibold text-white/60">Nenhum cliente cadastrado ainda</p>
                <Link href="/clientes/novo" className="text-xs font-bold text-brand-300">Cadastrar o primeiro cliente</Link>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {filtrados.map((item) =>
                item.tipo === 'cadastrado' ? (
                  <button
                    key={item.cliente.id}
                    onClick={() => setSelecionado(item.cliente)}
                    className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-white/10"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-xs font-extrabold text-brand-300">
                      {item.cliente.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{item.cliente.nome}</div>
                      <div className="truncate text-xs text-white/45">{formatarCpfCnpj(item.cliente.cpfCnpj)} · {item.cliente.cidade ?? '—'}{item.cliente.estado ? `/${item.cliente.estado}` : ''}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/8 px-2 py-1 text-[10px] font-bold uppercase text-white/50">
                      {item.cliente.tipoPessoa}
                    </span>
                  </button>
                ) : (
                  <Link
                    key={`erp-${item.codigo}`}
                    href={`/clientes/novo?nome=${encodeURIComponent(item.nome)}`}
                    className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-white/10"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-xs font-extrabold text-white/40">
                      {item.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{item.nome}</div>
                      <div className="truncate text-xs text-white/45">Já comprou · sem cadastro pra nota fiscal ainda</div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning-500/15 px-2 py-1 text-[10px] font-bold uppercase text-warning-400">
                      <UserPlus className="h-3 w-3" />
                      Cadastrar
                    </span>
                  </Link>
                )
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
