'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, BellRing, Check, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { SkeletonListaCards } from '@/components/ui/skeleton'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { listarLembretesPendentes, criarLembrete, concluirLembrete, apagarLembrete } from '@/lib/lembretes/queries'
import type { Lembrete } from '@/lib/lembretes/types'

function inicioDoDia(d: Date): Date {
  const copia = new Date(d)
  copia.setHours(0, 0, 0, 0)
  return copia
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function agrupar(lembretes: Lembrete[]) {
  const hoje = inicioDoDia(new Date())
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)

  const atrasados: Lembrete[] = []
  const deHoje: Lembrete[] = []
  const proximos: Lembrete[] = []

  for (const l of lembretes) {
    const data = inicioDoDia(new Date(l.dataLembrete))
    if (data < hoje) atrasados.push(l)
    else if (data < amanha) deHoje.push(l)
    else proximos.push(l)
  }

  return { atrasados, deHoje, proximos }
}

export function LembretesScreen() {
  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [apagando, setApagando] = useState<Lembrete | null>(null)

  function carregar() {
    listarLembretesPendentes()
      .then((dados) => { setLembretes(dados); setErro(null); setCarregando(false) })
      .catch((e) => { setErro(e instanceof Error ? e.message : 'Falha ao carregar lembretes'); setCarregando(false) })
  }

  useEffect(() => { carregar() }, [])

  async function handleCriar() {
    if (!titulo.trim() || !data) return
    setSalvando(true)
    try {
      await criarLembrete({ titulo: titulo.trim(), descricao: descricao.trim() || null, dataLembrete: data, clienteId: null })
      setTitulo(''); setDescricao(''); setData('')
      setCriando(false)
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar lembrete')
    } finally {
      setSalvando(false)
    }
  }

  async function handleConcluir(id: string) {
    try {
      await concluirLembrete(id)
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao concluir lembrete')
    }
  }

  async function handleApagar() {
    if (!apagando) return
    try {
      await apagarLembrete(apagando.id)
      setApagando(null)
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao apagar lembrete')
    }
  }

  const { atrasados, deHoje, proximos } = agrupar(lembretes)

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/mais" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90" aria-label="Voltar">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display text-lg font-bold">Lembretes</h1>
          <button
            onClick={() => setCriando(true)}
            aria-label="Novo lembrete"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-ink-950 transition-transform active:scale-90"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>

        {carregando && <SkeletonListaCards />}

        {!carregando && erro && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <ShieldCheck className="h-8 w-8 text-danger-400" />
            <p className="text-sm font-semibold text-white/70">Não foi possível carregar os lembretes</p>
            <p className="text-xs text-white/45">{erro}</p>
            <button onClick={carregar} className="mt-2 text-[11px] font-bold text-brand-300">Tentar de novo</button>
          </div>
        )}

        {!carregando && !erro && lembretes.length === 0 && (
          <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <BellRing className="h-8 w-8 text-white/25" />
            <p className="text-sm font-semibold text-white/60">Nenhum lembrete pendente</p>
          </div>
        )}

        {[
          { titulo: 'Atrasados', itens: atrasados, cor: 'text-danger-400' },
          { titulo: 'Hoje', itens: deHoje, cor: 'text-warning-400' },
          { titulo: 'Próximos', itens: proximos, cor: 'text-white/50' },
        ].map((grupo) =>
          grupo.itens.length > 0 && (
            <div key={grupo.titulo} className="flex flex-col gap-2">
              <span className={`px-1 text-[10px] font-bold uppercase tracking-wide ${grupo.cor}`}>{grupo.titulo}</span>
              {grupo.itens.map((l) => (
                <div key={l.id} className="glass flex items-start gap-3 rounded-2xl p-4">
                  <button
                    onClick={() => handleConcluir(l.id)}
                    aria-label="Concluir lembrete"
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 text-transparent transition-colors hover:border-brand-400 hover:text-brand-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white">{l.titulo}</div>
                    {l.clienteNome && <div className="text-xs text-brand-300">{l.clienteNome}</div>}
                    {l.descricao && <p className="mt-0.5 text-xs text-white/50">{l.descricao}</p>}
                    <div className="mt-1 text-[10px] font-semibold text-white/40">{fmtData(l.dataLembrete)}</div>
                  </div>
                  <button
                    onClick={() => setApagando(l)}
                    aria-label="Apagar lembrete"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-danger-500/10 hover:text-danger-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {criando && (
        <Dialog open onClose={() => !salvando && setCriando(false)} title="Novo lembrete">
          <Input id="lembrete-titulo" name="titulo" tone="dark" label="Título" placeholder="Ligar pro cliente X" value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={salvando} />
          <Input id="lembrete-descricao" name="descricao" tone="dark" label="Descrição · opcional" value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={salvando} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lembrete-data" className="text-[11px] font-bold uppercase tracking-wide text-white/50">Data</label>
            <input
              id="lembrete-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              disabled={salvando}
              className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[16px] font-medium text-white outline-none focus:border-brand-400"
            />
          </div>
          <Button onClick={handleCriar} disabled={salvando || !titulo.trim() || !data}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar lembrete
          </Button>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!apagando}
        onClose={() => setApagando(null)}
        onConfirm={handleApagar}
        title="Apagar este lembrete?"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Apagar"
        variant="danger"
      />
    </main>
  )
}
