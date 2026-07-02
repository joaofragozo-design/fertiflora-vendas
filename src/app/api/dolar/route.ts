import { NextResponse } from 'next/server'

export const revalidate = 300 // 5 min — dólar "em tempo real" sem martelar a API a cada request

export async function GET() {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      next: { revalidate },
    })
    if (!res.ok) throw new Error(`AwesomeAPI respondeu ${res.status}`)
    const data = await res.json()
    const bid = parseFloat(data.USDBRL?.bid)
    if (!bid || Number.isNaN(bid)) throw new Error('Resposta sem cotação válida')
    return NextResponse.json({ bid, timestamp: data.USDBRL?.create_date ?? null })
  } catch (err) {
    // Fallback: nunca deixar a tela de cotação travada por uma API externa fora do ar
    console.error('[api/dolar] falhou, usando fallback:', err)
    return NextResponse.json({ bid: 5.2, timestamp: null, fallback: true })
  }
}
