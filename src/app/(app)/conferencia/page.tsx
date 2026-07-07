import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { ConferenciaScreen } from '@/components/pedidos/conferencia-screen'

export default async function ConferenciaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (perfil?.role !== 'conferencia' && perfil?.role !== 'admin') redirect(ROUTES.DASHBOARD)

  return <ConferenciaScreen />
}
