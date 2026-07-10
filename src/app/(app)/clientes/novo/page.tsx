import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { NovoClienteScreen } from '@/components/clientes/novo-cliente-screen'

export default async function NovoClientePage({ searchParams }: { searchParams: Promise<{ nome?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const sp = await searchParams
  return <NovoClienteScreen nomeInicial={sp?.nome} />
}
