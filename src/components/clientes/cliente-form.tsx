'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { clienteEmBranco, type ClienteInput, type TipoPessoa } from '@/lib/clientes/types'
import { buscarCnpj, somenteDigitos } from '@/lib/clientes/cnpj-lookup'

interface ClienteFormProps {
  onSalvar: (input: ClienteInput) => Promise<void>
  onCancelar?: () => void
}

export function ClienteForm({ onSalvar, onCancelar }: ClienteFormProps) {
  const [form, setForm] = useState<ClienteInput>(clienteEmBranco())
  const [salvando, setSalvando] = useState(false)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function set<K extends keyof ClienteInput>(campo: K, valor: ClienteInput[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleBuscarCnpj() {
    setErro(null)
    setBuscandoCnpj(true)
    try {
      const dados = await buscarCnpj(form.cpfCnpj)
      setForm((f) => ({
        ...f,
        nome: dados.nome || f.nome,
        nomeFantasia: dados.nomeFantasia || f.nomeFantasia,
        telefone: dados.telefone || f.telefone,
        cep: dados.cep || f.cep,
        logradouro: dados.logradouro || f.logradouro,
        numero: dados.numero || f.numero,
        complemento: dados.complemento || f.complemento,
        bairro: dados.bairro || f.bairro,
        cidade: dados.cidade || f.cidade,
        estado: dados.estado || f.estado,
      }))
      toast.success('Dados do CNPJ preenchidos automaticamente')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao buscar CNPJ')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  async function handleSubmit() {
    setErro(null)
    if (!form.nome.trim() || !form.cpfCnpj.trim()) {
      setErro(form.tipoPessoa === 'pj' ? 'Informe razão social e CNPJ.' : 'Informe nome e CPF.')
      return
    }
    setSalvando(true)
    try {
      await onSalvar(form)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar cliente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="glass flex flex-col gap-4 rounded-3xl p-5">
      <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] p-1">
        {(['pj', 'pf'] as TipoPessoa[]).map((tipo) => (
          <button
            key={tipo}
            onClick={() => set('tipoPessoa', tipo)}
            className={cn('flex-1 rounded-xl py-2 text-xs font-bold transition-colors', form.tipoPessoa === tipo ? 'bg-brand-500 text-ink-950' : 'text-white/50')}
          >
            {tipo === 'pj' ? 'Pessoa jurídica' : 'Pessoa física'}
          </button>
        ))}
      </div>

      <Input tone="dark" label={form.tipoPessoa === 'pj' ? 'Razão social' : 'Nome completo'} value={form.nome} onChange={(e) => set('nome', e.target.value)} />
      {form.tipoPessoa === 'pj' && (
        <Input tone="dark" label="Nome fantasia · opcional" value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wide text-white/50">{form.tipoPessoa === 'pj' ? 'CNPJ' : 'CPF'}</label>
          <div className="relative">
            <input
              value={form.cpfCnpj}
              onChange={(e) => set('cpfCnpj', e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 pr-11 text-[16px] font-medium text-white outline-none placeholder:text-white/45 focus:border-brand-400 focus:bg-brand-500/10"
            />
            {form.tipoPessoa === 'pj' && somenteDigitos(form.cpfCnpj).length === 14 && (
              <button
                type="button"
                onClick={handleBuscarCnpj}
                disabled={buscandoCnpj}
                aria-label="Buscar dados do CNPJ"
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-brand-500/25 text-brand-300 hover:bg-brand-500/40"
              >
                {buscandoCnpj ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
          {form.tipoPessoa === 'pj' && (
            <p className="text-[10.5px] text-white/50">Digite os 14 dígitos e toque na lupa pra preencher automático.</p>
          )}
        </div>
        <Input tone="dark" label="I.E. · opcional" value={form.inscricaoEstadual} onChange={(e) => set('inscricaoEstadual', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input tone="dark" label="Telefone" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
        <Input tone="dark" label="E-mail · opcional" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      </div>

      <div className="mt-1 flex items-center gap-2 border-t border-white/10 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">Endereço</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input tone="dark" label="CEP" value={form.cep} onChange={(e) => set('cep', e.target.value)} />
        <Input tone="dark" label="Cidade" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input tone="dark" label="Logradouro" value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} />
        </div>
        <Input tone="dark" label="Número" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input tone="dark" label="Bairro" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
        </div>
        <Input tone="dark" label="UF" value={form.estado} onChange={(e) => set('estado', e.target.value.toUpperCase())} maxLength={2} />
      </div>

      <Input tone="dark" label="Complemento · opcional" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} />

      {erro && (
        <div className="rounded-xl border border-danger-500/35 bg-danger-500/15 p-3 text-xs leading-snug text-danger-300">{erro}</div>
      )}

      <Button onClick={handleSubmit} disabled={salvando}>
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar cliente
      </Button>
      {onCancelar && (
        <Button variant="ghost" onClick={onCancelar} disabled={salvando}>Cancelar</Button>
      )}
    </div>
  )
}
