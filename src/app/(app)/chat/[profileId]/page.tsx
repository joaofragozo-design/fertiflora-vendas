import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { ConversaScreen } from '@/components/chat/conversa-screen'

export default async function ConversaPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  return <ConversaScreen userId={user.id} outroProfileId={profileId} />
}
