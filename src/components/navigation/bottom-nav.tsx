'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileClock, ClipboardList, Trophy, Users, Menu } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const ITENS = [
  { href: '/dashboard', label: 'Início', icone: Home },
  { href: '/ranking', label: 'Ranking', icone: Trophy },
  { href: '/cotacoes', label: 'Cotações', icone: FileClock },
  { href: '/pedidos', label: 'Pedidos', icone: ClipboardList },
  { href: '/clientes', label: 'Clientes', icone: Users },
  { href: '/mais', label: 'Mais', icone: Menu },
] as const

/** Navegação persistente — fica montada uma vez no layout, nunca remonta ao trocar de tela. */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/85 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {ITENS.map((item) => {
          const ativo = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
          const Icone = item.icone
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? 'page' : undefined}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors"
            >
              {ativo && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-400" />}
              <Icone className={cn('h-5 w-5 transition-colors', ativo ? 'text-brand-300' : 'text-white/45')} strokeWidth={ativo ? 2.4 : 2} />
              <span className={ativo ? 'text-brand-300' : 'text-white/45'}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
