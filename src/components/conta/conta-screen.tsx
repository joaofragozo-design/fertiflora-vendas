'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Bell, KeyRound, Loader2 } from 'lucide-react'
import { alterarSenha } from '@/lib/conta/queries'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'
import { somNotificacaoAtivado, definirSomNotificacao } from '@/lib/audio/notificacao-som'

interface ContaScreenProps {
  email: string
}

export function ContaScreen({ email }: ContaScreenProps) {
  usePageIntensity(0.15)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [somAtivado, setSomAtivado] = useState(true)

  useEffect(() => setSomAtivado(somNotificacaoAtivado()), [])

  function handleSom(ativado: boolean) {
    setSomAtivado(ativado)
    definirSomNotificacao(ativado)
  }

  async function handleSalvar() {
    if (novaSenha.length < 6) {
      toast.error('A nova senha precisa ter pelo menos 6 caracteres')
      return
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem')
      return
    }
    setSalvando(true)
    try {
      await alterarSenha(senhaAtual, novaSenha)
      toast.success('Senha alterada com sucesso')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao trocar a senha')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link
            href="/mais"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white transition-colors hover:bg-white/12 active:scale-90"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display text-lg font-bold">Minha Conta</h1>
        </div>

        <div className="glass flex flex-col gap-1 rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">E-mail</div>
          <div className="text-sm font-bold text-white">{email}</div>
        </div>

        <div className="glass flex flex-col gap-4 rounded-3xl p-5">
          <h2 className="font-display flex items-center gap-2 text-sm font-bold">
            <Bell className="h-4 w-4 text-white/50" />
            Notificações
          </h2>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Som de notificação</div>
              <div className="text-xs text-white/50">Toque/zoeira de outros vendedores não tocam som nem tremem a tela.</div>
            </div>
            <Switch checked={somAtivado} onChange={handleSom} label="Som de notificação" />
          </div>
        </div>

        <div className="glass flex flex-col gap-4 rounded-3xl p-5">
          <h2 className="font-display flex items-center gap-2 text-sm font-bold">
            <KeyRound className="h-4 w-4 text-white/50" />
            Trocar senha
          </h2>
          <Input
            tone="dark"
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
          />
          <Input
            tone="dark"
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
          <Input
            tone="dark"
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
          />
          <Button onClick={handleSalvar} disabled={salvando || !senhaAtual || !novaSenha || !confirmarSenha}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar nova senha
          </Button>
        </div>
      </div>
    </main>
  )
}
