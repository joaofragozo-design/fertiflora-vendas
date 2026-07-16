import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { ContaScreen } from '@/components/conta/conta-screen'

export const metadata: Metadata = { title: 'Minha Conta' }

export default async function ContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  return <ContaScreen email={user.email ?? ''} />
}
