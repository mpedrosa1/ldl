/*
 * Service worker do LDL.
 *
 * Premissa que define todo o resto: este app mostra o estado AO VIVO da casa.
 * Servir uma resposta de API guardada em cache mostraria uma luz acesa que já
 * foi apagada — pior que não mostrar nada. Por isso o cache cobre só o
 * "casco" do app (HTML, JS, CSS, ícones); `/api/` nunca é cacheado.
 */

const VERSION = "ldl-v1";
const SHELL_CACHE = `${VERSION}-shell`;

/** Mínimo para a tela de offline aparecer sem rede. */
const PRECACHE = ["/offline.html", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Assets versionados do Next: o nome do arquivo muda a cada build, então
 * guardar para sempre é seguro e deixa a abertura instantânea. */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isApi(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Só mexe no que é do próprio site; streams de câmera e HA passam direto.
  if (url.origin !== self.location.origin) return;
  if (isApi(url)) return;

  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Navegação: rede primeiro (o conteúdo é dinâmico), com a tela de offline
  // como último recurso.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((hit) => hit ?? caches.match("/offline.html")),
      ),
    );
  }
});
