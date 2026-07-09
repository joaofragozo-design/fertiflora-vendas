import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
// Ícone do PWA usa a logo completa (com o lettering), não só o símbolo da folha --
// decisão explícita do cliente mesmo sabendo que o texto fica pequeno no ícone real
// do celular (a logo é bem larga, ~3.3:1, não dá pra ampliar sem cortar letras).
const src = join(root, 'public', 'logo-fertiflora-hd.png')
const dir = join(root, 'public', 'icons')

if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

const FUNDO = { r: 255, g: 255, b: 255 }

for (const size of [192, 512]) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { ...FUNDO, alpha: 1 } })
    // resize com fit:contain só preenche a margem externa (letterbox) -- os "buracos"
    // internos entre os traços da folha continuam transparentes sem isso, o que deixa
    // o icone inconsistente dependendo do fundo/tema do launcher do celular.
    .flatten({ background: FUNDO })
    .png()
    .toFile(join(dir, `icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)
}
