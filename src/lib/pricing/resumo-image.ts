export interface ResumoSecao {
  title: string
  rows: [string, string][]
  destaque?: number
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Carrega o logo real da empresa como HTMLImageElement, pra desenhar no canvas. */
function carregarLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo-fertiflora.png'
  })
}

/** Desenha o resumo em canvas e devolve a imagem como data URL PNG — usado por "Baixar", "Imprimir" e "Compartilhar". */
export async function gerarImagemResumo(secoes: ResumoSecao[], validade: string, rodape: string): Promise<string> {
  const totalRows = secoes.reduce((n, s) => n + s.rows.length, 0)
  const W = 900
  const H = 260 + secoes.length * 70 + totalRows * 58 + 90

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#122015')
  bg.addColorStop(1, '#070b09')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const logo = await carregarLogo()
  if (logo) {
    const alturaLogo = 64
    const larguraLogo = (alturaLogo * logo.width) / logo.height
    ctx.drawImage(logo, (W - larguraLogo) / 2, 20, larguraLogo, alturaLogo)
  } else {
    ctx.textAlign = 'center'
    ctx.fillStyle = '#5fd196'
    ctx.font = '700 34px Sora, -apple-system, Segoe UI, Arial'
    ctx.fillText('🌱 FertiFlora', W / 2, 78)
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(246,248,244,0.55)'
  ctx.font = '600 20px Manrope, -apple-system, Segoe UI, Arial'
  ctx.fillText('Resumo da cotação', W / 2, 110)

  // banner de validade — bem nítido, ninguém pode perder isso
  ctx.fillStyle = 'rgba(233,162,61,0.16)'
  roundRect(ctx, 60, 132, W - 120, 46, 12)
  ctx.fill()
  ctx.fillStyle = '#f3b454'
  ctx.font = '800 18px Manrope, -apple-system, Segoe UI, Arial'
  ctx.fillText(`⚠ ${validade}`, W / 2, 161)

  let y = 225
  for (const sec of secoes) {
    const gradHead = ctx.createLinearGradient(60, 0, W - 60, 0)
    gradHead.addColorStop(0, '#9de6bd')
    gradHead.addColorStop(1, '#18a558')
    ctx.fillStyle = gradHead
    roundRect(ctx, 60, y - 32, W - 120, 44, 10)
    ctx.fill()
    ctx.fillStyle = '#0b120e'
    ctx.font = '800 18px Sora, -apple-system, Segoe UI, Arial'
    ctx.textAlign = 'left'
    ctx.fillText(sec.title.toUpperCase(), 76, y - 4)
    y += 44

    sec.rows.forEach((row, i) => {
      const isMain = sec.destaque === i
      ctx.font = `${isMain ? '800 24px' : '600 21px'} Manrope, -apple-system, Segoe UI, Arial`
      ctx.fillStyle = isMain ? '#F6F8F4' : 'rgba(246,248,244,0.6)'
      ctx.textAlign = 'left'
      ctx.fillText(row[0], 66, y)
      ctx.fillStyle = isMain ? '#9de6bd' : '#F6F8F4'
      ctx.textAlign = 'right'
      ctx.fillText(row[1], W - 66, y)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath()
      ctx.moveTo(60, y + 20)
      ctx.lineTo(W - 60, y + 20)
      ctx.stroke()
      y += isMain ? 62 : 54
    })
    y += 26
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(246,248,244,0.35)'
  ctx.font = '600 15px Manrope, -apple-system, Segoe UI, Arial'
  ctx.fillText(rodape, W / 2, H - 34)

  return canvas.toDataURL('image/png')
}
