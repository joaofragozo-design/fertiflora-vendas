// Gera a marca amarela do Vendas a partir da marca roxa do Trilho STO (mesma
// folha, mesmo recorte — identidade compartilhada com FertiLog): gira o matiz
// para amarelo mantendo saturação/luminosidade (resultado: amarelo-claro) e
// produz:
//   public/fertiflora-mark-amarelo.png  (folha recolorida, alpha preservado)
//   src/app/icon.png                    (favicon 512, folha sobre amarelo-escuro, cantos arredondados)
//   src/app/apple-icon.png              (180, "adicionar à tela de início" do iPhone)
//   public/icons/icon-192.png / icon-512.png (maskable: folha centrada sobre amarelo-escuro)
import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const STO_MARK = 'C:/Projetos/FertiFloraSTO/public/fertiflora-mark-roxo.png'
const HUE_AMARELO = 48 // matiz do amarelo da identidade do Vendas
const FUNDO_ICONE = { r: 0x7a, g: 0x5c, b: 0x00 } // #7A5C00 — amarelo-escuro (mostarda)

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0))
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToRgb(h, s, l) {
  h /= 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255))
}

/** Cor média ponderada por alpha. */
async function corMedia(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let r = 0, g = 0, b = 0, peso = 0
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3] / 255
    r += data[i] * a; g += data[i + 1] * a; b += data[i + 2] * a; peso += a
  }
  return [r / peso, g / peso, b / peso]
}

// 1. Cor do traço: média da folha lilás → mesma S/L girada para o amarelo,
//    com piso de luminosidade para garantir o "amarelo-claro" pedido
const lilas = await corMedia(STO_MARK)
const [, s, l] = rgbToHsl(...lilas)
const [ar, ag, ab] = hslToRgb(HUE_AMARELO, s, Math.max(l, 0.74))
console.log(`traço: lilás rgb(${lilas.map(Math.round).join(',')}) → amarelo rgb(${ar},${ag},${ab})`)

// 2. Recolore a folha: cor sólida amarela + alpha original (antialias preservado)
const meta = await sharp(STO_MARK).metadata()
const alpha = await sharp(STO_MARK).ensureAlpha().extractChannel('alpha').toBuffer()
const folhaAmarela = await sharp({
  create: { width: meta.width, height: meta.height, channels: 3, background: { r: ar, g: ag, b: ab } },
})
  .joinChannel(alpha)
  .png()
  .toBuffer()
await sharp(folhaAmarela).toFile(join(root, 'public/fertiflora-mark-amarelo.png'))
console.log(`ok: public/fertiflora-mark-amarelo.png (${meta.width}x${meta.height})`)

/** Quadrado amarelo-escuro com a folha centrada; raio > 0 arredonda os cantos. */
async function icone(tam, alturaFolhaPct, raio) {
  const alturaFolha = Math.round(tam * alturaFolhaPct)
  const larguraFolha = Math.round(alturaFolha * (meta.width / meta.height))
  const folhaMenor = await sharp(folhaAmarela).resize(larguraFolha, alturaFolha).png().toBuffer()
  let img = sharp({
    create: { width: tam, height: tam, channels: 4, background: { ...FUNDO_ICONE, alpha: 1 } },
  }).composite([
    { input: folhaMenor, left: Math.round((tam - larguraFolha) / 2), top: Math.round((tam - alturaFolha) / 2) },
  ])
  if (raio > 0) {
    const mask = Buffer.from(
      `<svg width="${tam}" height="${tam}"><rect width="${tam}" height="${tam}" rx="${raio}" ry="${raio}"/></svg>`
    )
    img = sharp(await img.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }])
  }
  return img.png()
}

// 3. Favicon: cantos arredondados (fica bem na aba clara ou escura)
await (await icone(512, 0.62, 512 * 0.22)).toFile(join(root, 'src/app/icon.png'))
console.log('ok: src/app/icon.png (512)')

// 4. Ícones do app instalado: maskable → sangria total, folha na zona segura (~58%)
for (const [tam, destino] of [
  [192, 'public/icons/icon-192.png'],
  [512, 'public/icons/icon-512.png'],
  [180, 'src/app/apple-icon.png'],
]) {
  await (await icone(tam, 0.58, 0)).toFile(join(root, destino))
  console.log(`ok: ${destino}`)
}
