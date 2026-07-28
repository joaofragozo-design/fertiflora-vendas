'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/constants/routes'
import { ConfirmDialog } from '@/components/ui/dialog'

export function SignOutButton() {
  const [confirmando, setConfirmando] = useState(false)
  const [saindo, setSaindo] = useState(false)

  async function handleSignOut() {
    setSaindo(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = ROUTES.LOGIN
  }

  return (
    <>
      <button
        onClick={() => setConfirmando(true)}
        aria-label="Sair da conta"
        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sair
      </button>

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={handleSignOut}
        loading={saindo}
        title="Sair da conta?"
        description="Você vai precisar informar usuário e senha de novo pra entrar."
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </>
  )
}
