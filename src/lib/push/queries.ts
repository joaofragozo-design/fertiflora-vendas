import { createClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function pushSuportado(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function notificacoesPushAtivas(): Promise<boolean> {
  if (!pushSuportado()) return false
  const registro = await navigator.serviceWorker.getRegistration()
  if (!registro) return false
  const subscription = await registro.pushManager.getSubscription()
  return !!subscription
}

/**
 * Fluxo completo: permissão do navegador -> assinatura no push manager -> persiste no banco.
 * O service worker só registra em build de produção (ver sw-register.tsx) -- em dev, sempre
 * lança um erro claro em vez de falhar silenciosamente.
 */
export async function ativarNotificacoesPush(userId: string): Promise<void> {
  if (!pushSuportado()) {
    throw new Error('Notificações push não são suportadas neste navegador.')
  }

  const registro = await navigator.serviceWorker.getRegistration()
  if (!registro) {
    throw new Error('Notificações push só funcionam na versão publicada do site (não no modo de desenvolvimento).')
  }

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') {
    throw new Error('Permissão de notificação negada. Ative nas configurações do navegador.')
  }

  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!chavePublica) {
    throw new Error('Chave pública de push não configurada.')
  }

  const registroPronto = await navigator.serviceWorker.ready
  const subscription = await registroPronto.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(chavePublica) as BufferSource,
  })

  const json = subscription.toJSON()
  const supabase = createClient()
  const { error } = await supabase.from('chat_push_subscriptions').upsert(
    {
      usuario_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth_key: json.keys?.auth,
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw new Error(`Falha ao salvar assinatura de push: ${error.message}`)
}

export async function desativarNotificacoesPush(): Promise<void> {
  if (!pushSuportado()) return
  const registro = await navigator.serviceWorker.getRegistration()
  if (!registro) return
  const subscription = await registro.pushManager.getSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()

  const supabase = createClient()
  await supabase.from('chat_push_subscriptions').delete().eq('endpoint', endpoint)
}
