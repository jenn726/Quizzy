const CACHE_NAME = "quizzy-v2";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

async function cargarPreguntasAmpliadas() {
  const baseResponse = await fetch("preguntas.json?base=" + Date.now());
  if (!baseResponse.ok) return baseResponse;

  const base = await baseResponse.json();
  const extras = await Promise.all([
    fetch("preguntas-extra-1.json?" + Date.now()).then(r => r.json()),
    fetch("preguntas-extra-2.json?" + Date.now()).then(r => r.json()),
    fetch("preguntas-extra-3.json?" + Date.now()).then(r => r.json()),
    fetch("preguntas-extra-4.json?" + Date.now()).then(r => r.json()),
    fetch("preguntas-extra-5.json?" + Date.now()).then(r => r.json()),
    fetch("preguntas-extra-6.json?" + Date.now()).then(r => r.json())
  ]);

  for (const extra of extras) {
    for (const curso of Object.keys(extra)) {
      if (!base[curso]) base[curso] = {};
      for (const categoria of Object.keys(extra[curso])) {
        if (!base[curso][categoria]) base[curso][categoria] = [];
        base[curso][categoria] = base[curso][categoria].concat(extra[curso][categoria]);
      }
    }
  }

  return new Response(JSON.stringify(base), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/preguntas.json")) {
    event.respondWith(cargarPreguntasAmpliadas().catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
