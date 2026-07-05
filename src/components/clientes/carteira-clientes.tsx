'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Users } from 'lucide-react'
import { listarClientes, inscreverClientesEmTempoReal } from '@/lib/clientes/queries'
import type { Cliente } from '@/lib/clientes/types'
import { ClienteHistorico } from '@/components/clientes/cliente-historico'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { formatarCpfCnpj } from '@/lib/utils/formatadores'
import { SkeletonListaCards } from '@/components/ui/skeleton'

export function CarteiraClientes() {
  usePageIntensity(0.2)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<Cliente | null>(null)

  useEffect(() => {
    let ativo = true
    function carregar() {
      listarClientes().then((c) => { if (ativo) { setClientes(c); setCarregando(false) } })
    }
    carregar()
    const parar = inscreverClientesEmTempoReal(carregar)
    return () => { ativo = false; parar() }
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return clientes
    return clientes.filter((c) => c.nome.toLowerCase().includes(termo) || c.cpfCnpj.includes(termo))
  }, [clientes, busca])

  if (selecionado) {
    return <ClienteHistorico cliente={selecionado} onVoltar={() => setSelecionado(null)} />
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
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
          {filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelecionado(c)}
              className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-white/10"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-xs font-extrabold text-brand-300">
                {c.nome.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{c.nome}</div>
                <div className="truncate text-xs text-white/45">{formatarCpfCnpj(c.cpfCnpj)} · {c.cidade ?? '—'}{c.estado ? `/${c.estado}` : ''}</div>
              </div>
              <span className="shrink-0 rounded-full bg-white/8 px-2 py-1 text-[10px] font-bold uppercase text-white/50">
                {c.tipoPessoa}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
