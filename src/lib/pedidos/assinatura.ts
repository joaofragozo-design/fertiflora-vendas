import { createClient } from '@/lib/supabase/client'

function dataUrlParaBlob(dataUrl: string): Blob {
  const [cabecalho, base64] = dataUrl.split(',')
  const mime = cabecalho.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Sobe a assinatura (canvas -> PNG) pro bucket privado `assinaturas` e grava no pedido. */
export async function enviarAssinatura(pedidoId: string, dataUrl: string): Promise<void> {
  const supabase = createClient()
  const path = `${pedidoId}/assinatura.png`

  const { error: erroUpload } = await supabase.storage.from('assinaturas').upload(path, dataUrlParaBlob(dataUrl), {
    upsert: true,
    contentType: 'image/png',
  })
  if (erroUpload) throw new Error(`Falha ao enviar assinatura: ${erroUpload.message}`)

  const { error: erroUpdate } = await supabase
    .from('pedidos')
    .update({ assinatura_url: path, assinado_em: new Date().toISOString() })
    .eq('id', pedidoId)
  if (erroUpdate) throw new Error(`Falha ao salvar assinatura no pedido: ${erroUpdate.message}`)
}

/** Bucket privado -- precisa de signed URL pra baixar/exibir a imagem depois. */
export async function resolverUrlAssinatura(path: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from('assinaturas').createSignedUrl(path, 3600)
  if (error || !data) throw new Error(`Falha ao gerar link da assinatura: ${error?.message ?? 'desconhecido'}`)
  return data.signedUrl
}
