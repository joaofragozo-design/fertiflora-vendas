import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { TurnoScreen } from '@/components/producao/turno-screen'

export default async function TurnoPage({ params }: { params: Promise<{ turnoId: string }> }) {
  const { turnoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (perfil?.role !== 'admin') redirect(ROUTES.DASHBOARD)

  return <TurnoScreen turnoId={turnoId} />
}
