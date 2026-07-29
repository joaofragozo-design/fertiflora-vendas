import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface CorpoRequisicao {
  destinatarios?: string[]
  todosExceto?: string
  titulo: string
  corpo: string
  url: string
}

function vapidConfigurado(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)
}

/**
 * Dispara notificação push de verdade (fora do app/navegador). Chamada em "dispare e esqueça"
 * pelo client logo depois de enviar mensagem/aviso -- nunca deve travar nem quebrar o envio em
 * si, por isso sempre responde 200 com o resultado, nunca lança erro pro chamador.
 */
export async function POST(request: Request) {
  if (!vapidConfigurado()) {
    console.error('[api/push/enviar] VAPID não configurado -- veja .env.local')
    return NextResponse.json({ ok: false, motivo: 'vapid_nao_configurado', enviados: 0, falhas: 0 })
  }

  let body: CorpoRequisicao
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, motivo: 'corpo_invalido', enviados: 0, falhas: 0 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  try {
    const admin = createAdminClient()

    let destinatarios: string[]
    if (body.todosExceto) {
      const { data, error } = await admin.from('profiles').select('id').neq('id', body.todosExceto)
      if (error) throw error
      destinatarios = (data ?? []).map((p) => p.id as string)
    } else {
      destinatarios = body.destinatarios ?? []
    }

    if (destinatarios.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0, falhas: 0 })
    }

    const { data: assinaturas, error: erroAssinaturas } = await admin
      .from('chat_push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .in('usuario_id', destinatarios)
    if (erroAssinaturas) throw erroAssinaturas

    const payload = JSON.stringify({ title: body.titulo, body: body.corpo, url: body.url })

    const resultados = await Promise.allSettled(
      (assinaturas ?? []).map(async (a) => {
        try {
          await webpush.sendNotification(
            { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth_key } },
            payload
          )
        } catch (e) {
          const status = (e as { statusCode?: number })?.statusCode
          if (status === 404 || status === 410) {
            await admin.from('chat_push_subscriptions').delete().eq('id', a.id)
          }
          throw e
        }
      })
    )

    const falhas = resultados.filter((r) => r.status === 'rejected').length
    return NextResponse.json({ ok: true, enviados: resultados.length - falhas, falhas })
  } catch (err) {
    console.error('[api/push/enviar] falha ao enviar push:', err)
    return NextResponse.json({ ok: false, motivo: 'erro_interno', enviados: 0, falhas: 0 })
  }
}
