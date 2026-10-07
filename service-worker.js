const CACHE_NAME = "quizzy-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./cargar-preguntas-ampliadas.js",
  "./firebase-quizzy.js",
  "./quizzy-icon.svg",
  "./preguntas.json",
  "./preguntas-extra-1.json",
  "./preguntas-extra-2.json",
  "./preguntas-extra-3.json",
  "./preguntas-extra-4.json",
  "./preguntas-extra-5.json",
  "./preguntas-extra-6.json",
  "./preguntas-extra-7.json",
  "./preguntas-extra-8.json",
  "./preguntas-extra-9.json",
  "./preguntas-extra-10.json",
  "./preguntas-extra-11.json",
  "./dragon-morado.png",
  "./dragon-joven.png",
  "./dragon-magico.png",
  "./dragon-poderoso.png",
  "./dragon-legendario.png",
  "./dragon-supremo2.png",
  "./fenix.png",
  "./dragon-supremo-nuevo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function preguntaBase(url) {
  const limpio = new URL(url.href);
  limpio.search = "";
  return limpio.href;
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const esPregunta = /\/preguntas(?:-extra-\d+)?\.json$/.test(url.pathname);

  if (esPregunta) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then(cache =>
              cache.put(new Request(preguntaBase(url)), copia)
            );
          }
          return response;
        })
        .catch(() => caches.match(preguntaBase(url)))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copia = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
