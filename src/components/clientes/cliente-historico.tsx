'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, FileClock, Loader2, MapPin, Plus } from 'lucide-react'
import { listarCotacoesDoCliente } from '@/lib/cotacoes/queries'
import type { CotacaoSalva } from '@/lib/cotacoes/types'
import { listarVisitasDoCliente, registrarVisita } from '@/lib/visitas/queries'
import type { Visita } from '@/lib/visitas/types'
import type { Cliente } from '@/lib/clientes/types'
import { cn } from '@/lib/utils/cn'
import { formatarCpfCnpj, formatarTelefone } from '@/lib/utils/formatadores'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function fmtBRL(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtData(iso: string) { return new Date(iso).toLocaleDateString('pt-BR') }

export function ClienteHistorico({ cliente, onVoltar }: { cliente: Cliente; onVoltar: () => void }) {
  const [cotacoes, setCotacoes] = useState<CotacaoSalva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [carregandoVisitas, setCarregandoVisitas] = useState(true)
  const [registrando, setRegistrando] = useState(false)
  const [notas, setNotas] = useState('')
  const [proximoPasso, setProximoPasso] = useState('')
  const [proximoPassoData, setProximoPassoData] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    listarCotacoesDoCliente(cliente.id).then((c) => { setCotacoes(c); setCarregando(false) })
  }, [cliente.id])

  function carregarVisitas() {
    listarVisitasDoCliente(cliente.id).then((v) => { setVisitas(v); setCarregandoVisitas(false) }).catch(() => setCarregandoVisitas(false))
  }

  useEffect(() => { carregarVisitas() }, [cliente.id]) // eslint-disable-line react-hooks/exhaustive-deps -- carregarVisitas só depende de cliente.id, já na lista

  async function handleRegistrarVisita() {
    setSalvando(true)
    try {
      await registrarVisita({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        notas: notas.trim() || null,
        proximoPasso: proximoPasso.trim() || null,
        proximoPassoData: proximoPasso.trim() ? proximoPassoData || null : null,
      })
      setNotas(''); setProximoPasso(''); setProximoPassoData('')
      setRegistrando(false)
      toast.success('Visita registrada')
      carregarVisitas()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao registrar visita')
    } finally {
      setSalvando(false)
    }
  }

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

        <div className="flex items-center gap-2 px-1">
          <h2 className="font-display flex items-center gap-2 text-sm font-bold">
            <MapPin className="h-4 w-4 text-brand-300" />
            Visitas
          </h2>
          <button
            onClick={() => setRegistrando(true)}
            className="ml-auto flex items-center gap-1 text-[11px] font-bold text-brand-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Registrar visita
          </button>
        </div>

        {carregandoVisitas && <SkeletonListaCards linhas={1} />}
        {!carregandoVisitas && visitas.length === 0 && (
          <p className="glass rounded-2xl p-5 text-center text-xs text-white/45">Nenhuma visita registrada ainda.</p>
        )}
        <div className="flex flex-col gap-2">
          {visitas.map((v) => (
            <div key={v.id} className="glass flex flex-col gap-1 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">{fmtData(v.dataVisita)}</div>
              {v.notas && <p className="text-xs text-white/70">{v.notas}</p>}
              {v.proximoPasso && (
                <p className="text-xs font-semibold text-brand-300">Próximo passo: {v.proximoPasso}</p>
              )}
            </div>
          ))}
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

      {registrando && (
        <Dialog open onClose={() => !salvando && setRegistrando(false)} title="Registrar visita">
          <Input id="visita-notas" name="notas" tone="dark" label="Notas · opcional" value={notas} onChange={(e) => setNotas(e.target.value)} disabled={salvando} />
          <Input id="visita-proximo-passo" name="proximoPasso" tone="dark" label="Próximo passo · opcional" placeholder="Ligar em 3 dias com nova proposta" value={proximoPasso} onChange={(e) => setProximoPasso(e.target.value)} disabled={salvando} />
          {proximoPasso.trim() && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="visita-proximo-passo-data" className="text-[11px] font-bold uppercase tracking-wide text-white/50">Lembrar em · opcional</label>
              <input
                id="visita-proximo-passo-data"
                type="date"
                value={proximoPassoData}
                onChange={(e) => setProximoPassoData(e.target.value)}
                disabled={salvando}
                className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[16px] font-medium text-white outline-none focus:border-brand-400"
              />
            </div>
          )}
          <Button onClick={handleRegistrarVisita} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar visita
          </Button>
        </Dialog>
      )}
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
