import { createClient } from '@supabase/supabase-js'

/**
 * Cliente com service role -- ignora RLS de propósito. Só pode ser usado em rotas de API
 * (server-side), nunca em código 'use client'. A ausência do prefixo NEXT_PUBLIC_ na env var
 * já impede o bundler de expor a chave pro client; a checagem de `window` abaixo é uma
 * segunda trava em runtime contra uso indevido acidental.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient só pode ser usado no servidor.')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada -- veja .env.local.')
  }

  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}
