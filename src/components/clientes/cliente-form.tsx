'use client'

import { useState } from 'react'
import { Loader2, UserCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { clienteEmBranco, type ClienteInput, type TipoPessoa } from '@/lib/clientes/types'

interface ClienteFormProps {
  onSalvar: (input: ClienteInput) => Promise<void>
  onCancelar?: () => void
  titulo?: string
}

export function ClienteForm({ onSalvar, onCancelar, titulo }: ClienteFormProps) {
  const [form, setForm] = useState<ClienteInput>(clienteEmBranco())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function set<K extends keyof ClienteInput>(campo: K, valor: ClienteInput[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
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
      <h2 className="font-display flex items-center gap-2 text-sm font-bold">
        <UserCircle2 className="h-4.5 w-4.5 text-brand-300" />
        {titulo ?? 'Cadastro de cliente'}
      </h2>

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
        <Input tone="dark" label={form.tipoPessoa === 'pj' ? 'CNPJ' : 'CPF'} value={form.cpfCnpj} onChange={(e) => set('cpfCnpj', e.target.value)} />
        <Input tone="dark" label="Inscrição estadual · opcional" value={form.inscricaoEstadual} onChange={(e) => set('inscricaoEstadual', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input tone="dark" label="Telefone" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
        <Input tone="dark" label="E-mail · opcional" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
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
