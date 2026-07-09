import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'public', 'logo-icon.png')
const dir = join(root, 'public', 'icons')

if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

const FUNDO = { r: 7, g: 11, b: 9 }

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
