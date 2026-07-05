import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Users, UserPlus, FileClock, Wallet, FileText, ClipboardList, ShieldCheck } from 'lucide-react'
import { AnunciarIntensidade } from '@/components/scene/living-background/anunciar-intensidade'
import { Logo } from '@/components/brand/logo'
import { SignOutButton } from '@/components/forms/sign-out-button'
import { PerfilCard } from '@/components/perfil/perfil-card'
import { createClient } from '@/lib/supabase/server'
import { emailToUsername } from '@/lib/validations/auth'
import { ROUTES } from '@/constants/routes'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const ehAdmin = perfil?.role === 'admin'

  return (
    <main className="relative min-h-screen">
      <AnunciarIntensidade value={0.3} />

      <div className="relative z-10 mx-auto flex max-w-md flex-col gap-5 p-5 pt-6">
        <header className="flex items-center justify-between">
          <Logo variant="icon" height={30} />
          <SignOutButton />
        </header>

        <PerfilCard userId={user.id} usernameFallback={user.email ? emailToUsername(user.email) : 'vendedor'} />

        <Link href="/cotacao" className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold">Nova Cotação</div>
            <div className="text-xs text-white/45">Montar cotação pro cliente</div>
          </div>
        </Link>

        <Link href="/cotacoes" className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
            <FileClock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold">Cotações</div>
            <div className="text-xs text-white/45">Válidas e histórico</div>
          </div>
        </Link>

        <Link href="/pedidos/novo" className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold">Novo Pedido</div>
            <div className="text-xs text-white/45">Gerar contrato de venda</div>
          </div>
        </Link>

        <Link href="/pedidos" className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold">Meus Pedidos</div>
            <div className="text-xs text-white/45">Contratos gerados e status</div>
          </div>
        </Link>

        {ehAdmin && (
          <Link href="/admin/pedidos" className="glass flex items-center gap-3 rounded-2xl border border-warning-500/30 p-4 transition-colors hover:bg-white/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning-500/20 text-warning-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold">Aprovações</div>
              <div className="text-xs text-white/45">Pedidos aguardando decisão</div>
            </div>
          </Link>
        )}

        <Link href="/comissoes" className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold">Minhas Comissões</div>
            <div className="text-xs text-white/45">Recebidas e a receber, mês a mês</div>
          </div>
        </Link>

        <Link href="/clientes" className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-earth-tan/20 text-earth-tan">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold">Carteira de Clientes</div>
            <div className="text-xs text-white/45">Todos os clientes cadastrados</div>
          </div>
        </Link>

        <Link href="/clientes/novo" className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-earth-tan/20 text-earth-tan">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold">Cadastro de Clientes</div>
            <div className="text-xs text-white/45">Dados para nota fiscal</div>
          </div>
        </Link>
      </div>
    </main>
  )
}
