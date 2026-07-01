import { z } from 'zod'

/**
 * Mesmo mecanismo do sistema de Carregamento: não existe busca em tabela —
 * o username é convertido direto pra um e-mail interno do Supabase Auth.
 * Isso é o que permite reaproveitar exatamente os mesmos usuários dos dois sistemas.
 */
export const FAKE_EMAIL_DOMAIN = '@fertiflora.local'

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}${FAKE_EMAIL_DOMAIN}`
}

export function emailToUsername(email: string): string {
  return email.replace(FAKE_EMAIL_DOMAIN, '')
}

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Informe seu usuário')
    .regex(/^[a-z0-9_.]+$/i, 'Use apenas letras, números, ponto ou underscore'),
  password: z.string().min(1, 'Informe sua senha'),
})

export type LoginInput = z.infer<typeof loginSchema>
