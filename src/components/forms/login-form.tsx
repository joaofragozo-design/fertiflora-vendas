'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LoginFormProps {
  supabaseConfigured?: boolean
}

export function LoginForm({ supabaseConfigured = true }: LoginFormProps) {
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginInput) {
    if (!supabaseConfigured) {
      toast.error('Configure as variáveis do Supabase no .env.local antes de continuar.')
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : error.message)
      return
    }

    toast.success('Bem-vindo!')

    // Navegação completa garante que os cookies de sessão do Supabase
    // sejam enviados na próxima request SSR (evita corrida com router.push).
    const next = searchParams.get('next')
    window.location.href = next ?? ROUTES.DASHBOARD
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input
        label="E-mail"
        type="email"
        placeholder="voce@fertiflora.com"
        autoComplete="email"
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={!supabaseConfigured}
        error={errors.email?.message}
        {...register('email')}
      />

      <div className="relative">
        <Input
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={!supabaseConfigured}
          error={errors.password?.message}
          {...register('password')}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-[34px] text-white/40 transition-colors hover:text-white"
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          tabIndex={-1}
          disabled={!supabaseConfigured}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <Button type="submit" loading={isSubmitting} disabled={!supabaseConfigured} className="mt-2">
        {!isSubmitting && <LogIn className="h-4 w-4" />}
        Entrar
      </Button>
    </form>
  )
}
