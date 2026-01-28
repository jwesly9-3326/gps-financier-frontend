// 🧭 PL4TO - Service Worker
// PWA pour fonctionnement hors-ligne et installation

const CACHE_NAME = 'pl4to-v1.0.0';
const STATIC_CACHE = 'pl4to-static-v1';
const DYNAMIC_CACHE = 'pl4to-dynamic-v1';

// Ressources à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🧭 PL4TO Service Worker: Installation...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Mise en cache des ressources statiques...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Erreur installation:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🧭 PL4TO Service Worker: Activation...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => {
              console.log('🗑️ Suppression ancien cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('✅ Activation terminée');
        return self.clients.claim();
      })
  );
});

// Stratégie de cache: Network First avec fallback sur cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;
  
  // Ignorer les requêtes API (toujours network)
  if (url.pathname.startsWith('/api') || url.hostname !== location.hostname) {
    return;
  }
  
  // Ignorer les requêtes chrome-extension et autres
  if (!url.protocol.startsWith('http')) return;
  
  event.respondWith(
    // Stratégie: Network First
    fetch(request)
      .then((response) => {
        // Cloner la réponse pour la mettre en cache
        const responseClone = response.clone();
        
        caches.open(DYNAMIC_CACHE)
          .then((cache) => {
            cache.put(request, responseClone);
          });
        
        return response;
      })
      .catch(() => {
        // Si network échoue, essayer le cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si c'est une page, retourner la page d'accueil (SPA)
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Gestion des notifications push (pour futur usage)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nouvelle notification PL4TO',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'PL4TO', options)
  );
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('🧭 PL4TO Service Worker chargé');
