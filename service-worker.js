const CACHE_NAME = "quizzy-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./cargar-preguntas-ampliadas.js",
  "./firebase-quizzy.js",
  "./quizzy-icon.svg",
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

async function cargarPreguntasAmpliadas() {
  const baseResponse = await fetch("preguntas.json?base=" + Date.now());
  if (!baseResponse.ok) throw new Error("No se pudo cargar preguntas.json");

  const base = await baseResponse.json();
  const extras = await Promise.all(
    Array.from({length: 11}, (_, i) =>
      fetch("preguntas-extra-" + (i + 1) + ".json?" + Date.now()).then(r => {
        if (!r.ok) throw new Error("No se pudo cargar preguntas-extra-" + (i + 1) + ".json");
        return r.json();
      })
    )
  );

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
    headers: {"Content-Type":"application/json; charset=utf-8"}
  });
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/preguntas.json") && !url.searchParams.has("base")) {
    event.respondWith(
      cargarPreguntasAmpliadas()
        .then(async response => {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(new Request(url.href), response.clone());
          return response;
        })
        .catch(() => caches.match(event.request))
    );
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
