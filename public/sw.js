// Service worker mínimo: red primero, caché como respaldo sin conexión.
const CACHE = "una-manito-v4";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request))
  );
});

// Notificaciones push: llegan aunque la app esté cerrada, con sonido y vibración del sistema.
self.addEventListener("push", (e) => {
  let aviso = { titulo: "Una Manito", cuerpo: "", url: "/" };
  try { aviso = { ...aviso, ...e.data.json() }; } catch {}
  const urgente = aviso.url === "/socia"; // pedido nuevo para la socia: se queda en pantalla hasta que lo toque
  e.waitUntil(self.registration.showNotification(aviso.titulo, {
    body: aviso.cuerpo,
    icon: "/icono-192.png",
    badge: "/icono-192.png",
    tag: urgente ? "pedido-nuevo" : aviso.url,
    renotify: true,
    requireInteraction: urgente,
    silent: false,
    vibrate: urgente ? [400, 150, 400, 150, 400] : [200, 100, 200],
    data: { url: aviso.url },
  }));
});

// Al tocar una notificación, abrir (o enfocar) la app en la pantalla indicada.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      const abierta = lista.find((c) => c.url.includes(url));
      return abierta ? abierta.focus() : self.clients.openWindow(url);
    })
  );
});
