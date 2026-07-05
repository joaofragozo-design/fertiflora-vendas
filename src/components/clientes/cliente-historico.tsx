'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, FileClock } from 'lucide-react'
import { listarCotacoesDoCliente } from '@/lib/cotacoes/queries'
import type { CotacaoSalva } from '@/lib/cotacoes/types'
import type { Cliente } from '@/lib/clientes/types'
import { cn } from '@/lib/utils/cn'
import { formatarCpfCnpj, formatarTelefone } from '@/lib/utils/formatadores'
import { SkeletonListaCards } from '@/components/ui/skeleton'

function fmtBRL(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export function ClienteHistorico({ cliente, onVoltar }: { cliente: Cliente; onVoltar: () => void }) {
  const [cotacoes, setCotacoes] = useState<CotacaoSalva[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    listarCotacoesDoCliente(cliente.id).then((c) => { setCotacoes(c); setCarregando(false) })
  }, [cliente.id])

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <button onClick={onVoltar} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="font-display truncate text-lg font-bold">{cliente.nome}</h1>
        </div>

        <div className="glass flex flex-col gap-2 rounded-3xl p-5">
          <Row label="Documento" value={formatarCpfCnpj(cliente.cpfCnpj)} />
          {cliente.inscricaoEstadual && <Row label="Inscrição estadual" value={cliente.inscricaoEstadual} />}
          {cliente.telefone && <Row label="Telefone" value={formatarTelefone(cliente.telefone)} />}
          {cliente.email && <Row label="E-mail" value={cliente.email} />}
          {cliente.cidade && <Row label="Cidade/UF" value={`${cliente.cidade}${cliente.estado ? '/' + cliente.estado : ''}`} />}
          {cliente.logradouro && <Row label="Endereço" value={`${cliente.logradouro}, ${cliente.numero ?? 's/n'}${cliente.bairro ? ' — ' + cliente.bairro : ''}`} />}
        </div>

        <h2 className="font-display flex items-center gap-2 px-1 text-sm font-bold">
          <FileClock className="h-4 w-4 text-brand-300" />
          Histórico de cotações
        </h2>

        {carregando && <SkeletonListaCards />}
        {!carregando && cotacoes.length === 0 && (
          <p className="glass rounded-2xl p-5 text-center text-xs text-white/45">Nenhuma cotação salva para esse cliente ainda.</p>
        )}

        <div className="flex flex-col gap-2">
          {cotacoes.map((c) => (
            <div key={c.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{c.produto}</div>
                <div className="text-xs text-white/45">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</div>
              </div>
              <div className="text-right">
                <div className="tabular text-sm font-extrabold text-white">{fmtBRL(c.precoVendido)}/t</div>
                <span className={cn('text-[10px] font-bold uppercase', c.aprovado ? 'text-brand-300' : 'text-danger-400')}>
                  {c.aprovado ? 'Aprovada' : 'Reprovada'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-white/45">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  )
}
