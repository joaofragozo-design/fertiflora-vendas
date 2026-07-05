import { NextResponse } from 'next/server'

// Rota sempre dinâmica: nunca podemos cachear uma resposta de fallback (senão um
// 429 pontual da fonte principal fica "preso" servindo dólar errado por minutos).
export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 4500
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// AwesomeAPI dá o bid/ask real de mercado (atualiza a cada poucos segundos), mas a partir
// da rede da Vercel vem falhando de forma consistente (provável bloqueio por IP compartilhado
// entre muitos apps hospedados lá) — daí o header de navegador e o timeout curto.
async function buscarAwesomeApi(): Promise<number> {
  const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
    cache: 'no-store',
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`AwesomeAPI respondeu ${res.status}`)
  const data = await res.json()
  const bid = parseFloat(data.USDBRL?.bid)
  if (!bid || Number.isNaN(bid)) throw new Error('AwesomeAPI sem cotação válida')
  return bid
}

// HG Brasil sem chave roda em modo demo (cache de alguns minutos) — bem mais fresco que o
// fallback diário do open.er-api, então entra como segunda opção antes dele.
async function buscarHgBrasil(): Promise<number> {
  const res = await fetch('https://api.hgbrasil.com/finance?format=json-cors', {
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HG Brasil respondeu ${res.status}`)
  const data = await res.json()
  const buy = Number(data?.results?.currencies?.USD?.buy)
  const sell = Number(data?.results?.currencies?.USD?.sell)
  const bid = sell ? (buy + sell) / 2 : buy
  if (!bid || Number.isNaN(bid)) throw new Error('HG Brasil sem cotação válida')
  return bid
}

// Só entra em último caso — esse endpoint atualiza cerca de uma vez por dia, não é "tempo real".
async function buscarExchangeRateFallback(): Promise<number> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`open.er-api respondeu ${res.status}`)
  const data = await res.json()
  const bid = Number(data.rates?.BRL)
  if (!bid || Number.isNaN(bid)) throw new Error('open.er-api sem cotação válida')
  return bid
}

const FONTES = [
  { nome: 'awesomeapi', buscar: buscarAwesomeApi },
  { nome: 'hgbrasil', buscar: buscarHgBrasil },
  { nome: 'exchangerate-diario', buscar: buscarExchangeRateFallback },
] as const

export async function GET() {
  for (const { nome, buscar } of FONTES) {
    try {
      const bid = await buscar()
      return NextResponse.json({ bid, timestamp: new Date().toISOString(), fonte: nome })
    } catch (err) {
      console.error(`[api/dolar] ${nome} falhou:`, err)
    }
  }

  // Última linha de defesa: nunca deixar a tela de cotação travada por APIs externas fora do ar
  return NextResponse.json({ bid: 5.2, timestamp: null, fallback: true })
}
