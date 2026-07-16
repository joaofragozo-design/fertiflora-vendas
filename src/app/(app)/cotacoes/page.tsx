import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { cotacaoConfigFromRow } from '@/lib/cotacoes/types'
import { CotacoesScreen } from '@/components/cotacoes/cotacoes-screen'

export default async function CotacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const [{ data: perfil }, { data: configRow }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('cotacao_config').select('*').limit(1).maybeSingle(),
  ])
  const ehAdmin = perfil?.role === 'admin'
  const configInicial = configRow ? cotacaoConfigFromRow(configRow) : null

  return <CotacoesScreen ehAdmin={ehAdmin} configInicial={configInicial} />
}
