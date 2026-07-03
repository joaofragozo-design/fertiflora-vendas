'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { ClienteForm } from '@/components/clientes/cliente-form'
import { criarCliente } from '@/lib/clientes/queries'
import { usePageIntensity } from '@/components/scene/living-background/use-page-intensity'

export function NovoClienteScreen() {
  usePageIntensity(0.2)
  const router = useRouter()

  return (
    <main className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/clientes" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="font-display text-lg font-bold">Cadastro de Cliente</h1>
        </div>

        <ClienteForm
          onSalvar={async (input) => {
            await criarCliente(input)
            toast.success('Cliente cadastrado com sucesso')
            router.push('/clientes')
          }}
        />
      </div>
    </main>
  )
}
