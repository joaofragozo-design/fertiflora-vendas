'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { listarLinhas, listarFormulasUsadas, criarTurno } from '@/lib/producao/queries'
import { novoTurnoEmBranco, type NovoTurnoInput, type ProducaoLinha } from '@/lib/producao/types'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'

export function NovoTurnoScreen() {
  usePageIntensity(0.2)
  const router = useRouter()
  const [linhas, setLinhas] = useState<ProducaoLinha[]>([])
  const [formulas, setFormulas] = useState<string[]>([])
  const [form, setForm] = useState<NovoTurnoInput>(() => novoTurnoEmBranco())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    listarLinhas().then((dados) => {
      setLinhas(dados)
      if (dados[0]) setForm((f) => ({ ...f, linhaId: f.linhaId || dados[0].id }))
    })
  }, [])

  useEffect(() => {
    if (!form.linhaId) return
    listarFormulasUsadas(form.linhaId).then(setFormulas)
  }, [form.linhaId])

  function set<K extends keyof NovoTurnoInput>(campo: K, valor: NovoTurnoInput[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit() {
    setErro(null)
    if (!form.linhaId) { setErro('Selecione a granuladora.'); return }
    if (!form.responsavelNome.trim()) { setErro('Informe o nome do responsável.'); return }
    setSalvando(true)
    try {
      const turno = await criarTurno(form)
      toast.success('Turno aberto')
      router.push(`/producao/${turno.id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao abrir turno.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/producao" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display text-lg font-bold">Abrir Turno — Granuladora</h1>
        </div>

        <div className="glass flex flex-col gap-4 rounded-3xl p-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">Granuladora</span>
            <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
              {linhas.map((linha) => (
                <button
                  key={linha.id}
                  type="button"
                  onClick={() => set('linhaId', linha.id)}
                  className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', form.linhaId === linha.id ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
                >
                  {linha.nome}
                </button>
              ))}
            </div>
          </div>

          <Input id="turno-data" name="data" tone="dark" label="Dia" type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <Input
              id="turno-formula"
              name="formula"
              list="formulas-conhecidas"
              tone="dark"
              label="Fórmula"
              placeholder="Ex.: NPK 08-20-20 + organomineral"
              value={form.formula}
              onChange={(e) => set('formula', e.target.value)}
            />
            <datalist id="formulas-conhecidas">
              {formulas.map((f) => <option key={f} value={f} />)}
            </datalist>
            <p className="text-[10.5px] text-white/45">Usada pra estimar sozinho o rendimento esperado dessa fórmula ao longo do tempo — sem isso o turno fecha sem o fator Performance.</p>
          </div>

          <Input id="turno-responsavel" name="responsavelNome" tone="dark" label="Nome do responsável" value={form.responsavelNome} onChange={(e) => set('responsavelNome', e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Input id="turno-horimetro" name="horimetroInicio" tone="dark" label="Horímetro · início" inputMode="decimal" value={form.horimetroInicio} onChange={(e) => set('horimetroInicio', e.target.value)} />
            <Input id="turno-hora-inicio" name="horaInicio" tone="dark" label="Hora início" type="time" value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} />
          </div>

          {erro && <div className="rounded-xl border border-danger-500/35 bg-danger-500/15 p-3 text-xs leading-snug text-danger-300">{erro}</div>}

          <Button onClick={handleSubmit} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Abrir turno
          </Button>
        </div>
      </div>
    </main>
  )
}
