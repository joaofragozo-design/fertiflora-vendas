const CACHE = 'fertiflora-vendas-v2'
const PRECACHE = ['/logo-fertiflora.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Nunca interceptar navegação de página (HTML) nem fetch de dados (API, RSC payload) -- só isso já
// causou bugs de página errada aparecendo no lugar de outra (cache antigo servindo HTML/RSC obsoleto
// pra uma URL diferente da que gerou aquele cache). O SW só deve tocar em ativo estático versionado
// pelo Next (nome com hash em /_next/static/) ou imagem/ícone -- nunca em algo que representa "estado".
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (e.request.mode === 'navigate') return

  const url = new URL(e.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  const eAtivoEstatico = url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  if (!eAtivoEstatico) return

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached
      return fetch(e.request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      })
    })
  )
})
