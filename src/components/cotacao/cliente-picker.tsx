'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, UserPlus, Users } from 'lucide-react'
import { listarClientes } from '@/lib/clientes/queries'
import type { Cliente } from '@/lib/clientes/types'

interface ClientePickerProps {
  onSelecionar: (cliente: Cliente) => void
  onNovoCliente: () => void
  onVoltar: () => void
}

export function ClientePicker({ onSelecionar, onNovoCliente, onVoltar }: ClientePickerProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    listarClientes().then((c) => { setClientes(c); setCarregando(false) })
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return clientes
    return clientes.filter((c) => c.nome.toLowerCase().includes(termo) || c.cpfCnpj.includes(termo))
  }, [clientes, busca])

  return (
    <main className="min-h-screen bg-ink-950 pb-16">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <button onClick={onVoltar} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display text-lg font-bold">Selecionar Cliente</h1>
        </div>

        <button onClick={onNovoCliente} className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
            <UserPlus className="h-4.5 w-4.5" />
          </div>
          <div className="font-display text-sm font-bold">Cadastrar novo cliente</div>
        </button>

        <div className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>

        {carregando && <p className="text-center text-xs text-white/40">Carregando clientes…</p>}
        {!carregando && filtrados.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <Users className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">Nenhum cliente encontrado</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelecionar(c)}
              className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-white/10"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-xs font-extrabold text-brand-300">
                {c.nome.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{c.nome}</div>
                <div className="truncate text-xs text-white/45">{c.cpfCnpj}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
