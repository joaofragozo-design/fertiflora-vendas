import { NextResponse } from 'next/server'

// Rota sempre dinâmica: nunca podemos cachear uma resposta de fallback (senão um
// 429 pontual da fonte principal fica "preso" servindo dólar errado por minutos).
export const dynamic = 'force-dynamic'

async function buscarAwesomeApi(): Promise<number> {
  const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', { cache: 'no-store' })
  if (!res.ok) throw new Error(`AwesomeAPI respondeu ${res.status}`)
  const data = await res.json()
  const bid = parseFloat(data.USDBRL?.bid)
  if (!bid || Number.isNaN(bid)) throw new Error('AwesomeAPI sem cotação válida')
  return bid
}

async function buscarExchangeRateFallback(): Promise<number> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })
  if (!res.ok) throw new Error(`open.er-api respondeu ${res.status}`)
  const data = await res.json()
  const bid = Number(data.rates?.BRL)
  if (!bid || Number.isNaN(bid)) throw new Error('open.er-api sem cotação válida')
  return bid
}

export async function GET() {
  try {
    const bid = await buscarAwesomeApi()
    return NextResponse.json({ bid, timestamp: new Date().toISOString() })
  } catch (err1) {
    console.error('[api/dolar] AwesomeAPI falhou, tentando fonte alternativa:', err1)
    try {
      const bid = await buscarExchangeRateFallback()
      return NextResponse.json({ bid, timestamp: new Date().toISOString(), fonte: 'alternativa' })
    } catch (err2) {
      // Última linha de defesa: nunca deixar a tela de cotação travada por APIs externas fora do ar
      console.error('[api/dolar] fonte alternativa também falhou, usando valor fixo:', err2)
      return NextResponse.json({ bid: 5.2, timestamp: null, fallback: true })
    }
  }
}
