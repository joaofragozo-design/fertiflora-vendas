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

// Notificação push de verdade (chat) -- chega mesmo com o app/navegador fechado. Payload
// vem de src/app/api/push/enviar/route.ts como JSON { title, body, url }; nunca deve lançar
// (um push malformado não pode quebrar o service worker inteiro).
self.addEventListener('push', (e) => {
  let dados = {}
  try {
    dados = e.data ? e.data.json() : {}
  } catch {
    dados = {}
  }
  const titulo = dados.title || 'FertiFlora Vendas'
  const corpo = dados.body || 'Você tem uma notificação nova.'
  const url = dados.url || '/'
  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url },
    })
  )
})

// Ao tocar na notificação: foca uma janela já aberta na URL certa, senão abre uma nova.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data && e.notification.data.url ? e.notification.data.url : '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes(url) && 'focus' in cliente) return cliente.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
