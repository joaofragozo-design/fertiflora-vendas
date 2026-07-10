import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HandCoins, UserPlus, ShieldCheck, ClipboardCheck, Trophy, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { Logo } from '@/components/brand/logo'
import { SignOutButton } from '@/components/forms/sign-out-button'
import { SinoNotificacoes } from '@/components/notificacoes/sino-notificacoes'
import { AnunciarIntensidade } from '@/components/scene/living-background/anunciar-intensidade'

export default async function MaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const ehAdmin = perfil?.role === 'admin'
  const ehConferencia = perfil?.role === 'conferencia'

  return (
    <main className="relative z-10 min-h-screen pb-28">
      <AnunciarIntensidade value={0.2} />
      <div className="mx-auto flex max-w-md flex-col gap-5 p-5 pt-6">
        <header className="flex items-center justify-between">
          <Logo variant="icon" height={28} />
          <div className="flex items-center gap-2">
            <SinoNotificacoes />
            <SignOutButton />
          </div>
        </header>

        <h1 className="font-display px-1 text-lg font-bold">Mais</h1>

        <div className="flex flex-col gap-2">
          <ItemMenu href="/clientes/novo" icone={UserPlus} titulo="Cadastro de Clientes" descricao="Dados para nota fiscal" />
          {(ehConferencia || ehAdmin) && (
            <ItemMenu href="/conferencia" icone={ClipboardCheck} titulo="Conferência" descricao="Pedidos aguardando conferência" destaque />
          )}
          {ehAdmin && (
            <>
              <ItemMenu href="/admin/pedidos" icone={ShieldCheck} titulo="Análise de Crédito" descricao="Decisão final dos pedidos" destaque />
              <ItemMenu href="/admin/vendedores" icone={Trophy} titulo="Vendedores Comerciais" descricao="Gerenciar ranking, metas e faturamento" destaque />
            </>
          )}
        </div>
      </div>
    </main>
  )
}

function ItemMenu({
  href,
  icone: Icone,
  titulo,
  descricao,
  destaque,
}: {
  href: string
  icone: typeof HandCoins
  titulo: string
  descricao: string
  destaque?: boolean
}) {
  return (
    <Link
      href={href}
      className={`glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10 ${destaque ? 'border border-warning-500/30' : ''}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${destaque ? 'bg-warning-500/20 text-warning-400' : 'bg-brand-500/20 text-brand-300'}`}>
        <Icone className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-sm font-bold">{titulo}</div>
        <div className="text-xs text-white/50">{descricao}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
    </Link>
  )
}
