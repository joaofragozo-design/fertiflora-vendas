import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'
import { ChatScreen } from '@/components/chat/chat-screen'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const ehAdmin = perfil?.role === 'admin'

  return <ChatScreen ehAdmin={ehAdmin} userId={user.id} />
}
