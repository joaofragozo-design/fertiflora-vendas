import { BottomNav } from '@/components/navigation/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
