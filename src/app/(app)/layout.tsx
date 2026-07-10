import { BottomNav } from '@/components/navigation/bottom-nav'
import { NotificacaoToastListener } from '@/components/notificacoes/notificacao-toast-listener'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
      <NotificacaoToastListener />
    </>
  )
}
