'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Gauge, OctagonPause, CircleCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import {
  buscarTurno,
  listarParadas, registrarParada, encerrarParada,
  fecharTurno,
} from '@/lib/producao/queries'
import {
  fecharTurnoEmBranco, rotuloCategoria,
  type ProducaoTurno, type ProducaoParada, type FecharTurnoInput,
} from '@/lib/producao/types'
import { corDoAproveitamento } from '@/lib/producao/oee'
import { ParadaDialog } from '@/components/producao/parada-dialog'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'

const COR_TEXTO: Record<ReturnType<typeof corDoAproveitamento>, string> = {
  verde: 'text-brand-300',
  amarelo: 'text-warning-400',
  vermelho: 'text-danger-400',
  neutro: 'text-white/50',
}

function pct(valor: number | null): string {
  return valor === null ? '—' : `${Math.round(valor * 100)}%`
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

export function TurnoScreen({ turnoId }: { turnoId: string }) {
  usePageIntensity(0.2)
  const [turno, setTurno] = useState<ProducaoTurno | null>(null)
  const [paradas, setParadas] = useState<ProducaoParada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dialogParadaAberto, setDialogParadaAberto] = useState(false)

  const recarregar = useCallback(async () => {
    const [t, p] = await Promise.all([buscarTurno(turnoId), listarParadas(turnoId)])
    setTurno(t)
    setParadas(p)
    setCarregando(false)
  }, [turnoId])

  useEffect(() => { recarregar() }, [recarregar])

  if (carregando || !turno) {
    return (
      <main className="relative z-10 min-h-screen pb-28">
        <div className="mx-auto flex max-w-md items-center justify-center p-4 pt-24">
          <Loader2 className="h-6 w-6 animate-spin text-white/50" />
        </div>
      </main>
    )
  }

  const cor = corDoAproveitamento(turno.aproveitamento)

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/producao" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold">{turno.linhaNome} · {formatarData(turno.data)}</h1>
            <p className="truncate text-xs text-white/45">{turno.responsavelNome ?? 'sem responsável'}{turno.formula ? ` · ${turno.formula}` : ''}</p>
          </div>
        </div>

        {turno.status === 'fechado' && (
          <div className="glass flex flex-col gap-4 rounded-3xl p-5">
            <div className="flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-brand-300" />
              <span className="text-xs font-bold uppercase tracking-wide text-white/50">Turno fechado</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('font-display text-4xl font-extrabold', COR_TEXTO[cor])}>{pct(turno.aproveitamento)}</span>
              <span className="text-xs text-white/50">de aproveitamento (meta: 80%)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <FatorOee rotulo="Disponibilidade" valor={turno.disponibilidade} />
              <FatorOee rotulo="Performance" valor={turno.performance} />
              <FatorOee rotulo="Qualidade" valor={turno.qualidade} />
            </div>
            <p className="text-[10.5px] leading-snug text-white/40">
              {turno.performance === null
                ? turno.formula
                  ? 'Primeiro turno registrado com essa fórmula — virou a referência. A partir do próximo, o Performance aparece.'
                  : 'Sem fórmula informada nesse turno — Performance não pôde ser calculado.'
                : 'Performance comparado ao melhor turno já registrado para essa fórmula nessa granuladora.'}
            </p>
            <div className="flex justify-between border-t border-white/10 pt-3 text-xs text-white/50">
              <span>{turno.toneladasTotal ?? '—'} ton</span>
              <span>{turno.sacosTotal ?? '—'} sacos</span>
              <span>{turno.horimetroFinal !== null && turno.horimetroInicio !== null ? `${(turno.horimetroFinal - turno.horimetroInicio).toFixed(1)}h rodadas` : '—'}</span>
            </div>
          </div>
        )}

        <Secao titulo="Paradas" descricao="O motivo de cada parada — é o que mostra onde atacar (almoço entra como Programada e não pesa contra a meta)">
          {paradas.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {paradas.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/70">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-white/85">{rotuloCategoria(p.categoria)}</div>
                    {p.submotivo && <div className="truncate text-white/50">{p.submotivo}</div>}
                  </div>
                  {p.fim ? (
                    <span className="shrink-0 text-white/40">encerrada</span>
                  ) : turno.status === 'aberto' ? (
                    <button
                      onClick={async () => { await encerrarParada(p.id); toast.success('Parada encerrada'); recarregar() }}
                      className="shrink-0 rounded-full bg-warning-500/20 px-2.5 py-1 text-[10px] font-bold uppercase text-warning-400"
                    >
                      Encerrar
                    </button>
                  ) : (
                    <span className="shrink-0 text-warning-400">em andamento</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {turno.status === 'aberto' && (
            <Button variant="ghost" onClick={() => setDialogParadaAberto(true)}>
              <OctagonPause className="h-4 w-4" />
              Registrar parada
            </Button>
          )}
        </Secao>

        {turno.status === 'aberto' && (
          <FecharTurnoForm
            turno={turno}
            onFechado={(t) => { setTurno(t); toast.success('Turno fechado') }}
          />
        )}
      </div>

      <ParadaDialog
        open={dialogParadaAberto}
        onClose={() => setDialogParadaAberto(false)}
        onRegistrar={async (input) => { await registrarParada(turno.id, input); await recarregar() }}
      />
    </main>
  )
}

function FatorOee({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-white/[0.04] py-2.5">
      <span className="font-display text-sm font-bold text-white">{pct(valor)}</span>
      <span className="text-[10px] uppercase tracking-wide text-white/45">{rotulo}</span>
    </div>
  )
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-5">
      <div>
        <h2 className="font-display text-sm font-bold text-white">{titulo}</h2>
        <p className="text-[11px] text-white/45">{descricao}</p>
      </div>
      {children}
    </div>
  )
}

function FecharTurnoForm({ turno, onFechado }: { turno: ProducaoTurno; onFechado: (t: ProducaoTurno) => void }) {
  const [form, setForm] = useState<FecharTurnoInput>(() => fecharTurnoEmBranco())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function set<K extends keyof FecharTurnoInput>(campo: K, valor: FecharTurnoInput[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleFechar() {
    setErro(null)
    if (!form.horaFinal || !form.toneladasTotal) {
      setErro('Informe pelo menos a hora final e as toneladas totais.')
      return
    }
    setSalvando(true)
    try {
      const atualizado = await fecharTurno(turno, form)
      onFechado(atualizado)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao fechar turno.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="glass flex flex-col gap-4 rounded-3xl border border-brand-500/25 p-5">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-brand-300" />
        <h2 className="font-display text-sm font-bold text-white">Fechar turno</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input id="fechar-horimetro" name="horimetroFinal" tone="dark" label="Horímetro final" inputMode="decimal" value={form.horimetroFinal} onChange={(e) => set('horimetroFinal', e.target.value)} />
        <Input id="fechar-hora" name="horaFinal" tone="dark" label="Hora final" type="time" value={form.horaFinal} onChange={(e) => set('horaFinal', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="fechar-ton" name="toneladasTotal" tone="dark" label="Toneladas totais" inputMode="decimal" value={form.toneladasTotal} onChange={(e) => set('toneladasTotal', e.target.value)} />
        <Input id="fechar-sacos" name="sacosTotal" tone="dark" label="Sacos produzidos" inputMode="decimal" value={form.sacosTotal} onChange={(e) => set('sacosTotal', e.target.value)} />
      </div>
      <Input id="fechar-reciclo" name="toneladasReciclo" tone="dark" label="Reciclo / retrabalho · opcional" inputMode="decimal" value={form.toneladasReciclo} onChange={(e) => set('toneladasReciclo', e.target.value)} />

      {erro && <div className="rounded-xl border border-danger-500/35 bg-danger-500/15 p-3 text-xs leading-snug text-danger-300">{erro}</div>}

      <Button onClick={handleFechar} disabled={salvando}>
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        Fechar turno e calcular aproveitamento
      </Button>
    </div>
  )
}
