// EDTU Service Worker — cache del "shell" para que funcione offline.
// ⚠️ SUBE ESTE NÚMERO CADA VEZ QUE CAMBIES ALGO IMPORTANTE.
//
// Es lo que hace que los navegadores que ya visitaron EDTU tiren lo guardado y se bajen
// la versión nueva. Si no lo subes, alguien que entró ayer puede seguir viendo lo de ayer.
//
// v51: el LED RGB de WALLY + EDTU lista para Cloudflare Pages (2026-09-29).
// v52: cuentas de jugadores, hub con barra lateral, chat de amigos, y los
//      juegos nuevos (Salón de Estilo, Héroe Araña, Piano, 20 de 2 jugadores).
// v53: arreglado el scroll lateral en móvil (barra de arriba y lista de juegos).
// v54: Test de Reflejos (1 jugador con récord) y cronómetro en el de 2.
// v55: récords en la cuenta + puesto (medalla) en cada récord.
// v56: arreglado el récord de Reflejos (guardaba el PEOR tiempo).
// v58: los botones laterales del mouse sirven para volver atrás.
// v59: récords con límites de lo posible (fuera los 6 ms imposibles).
// v60: tabla de jugadores al tocar un récord; sin mínimo de tiempo.
// v61: nombres completos de los juegos en los récords.
// v62: no se borran récords rápidos, y se recupera el que se perdió.
// v63: en empate de récord, tú vas primero.
// v64: puesto general en EDTU (promedio de todos los juegos).
// v65: los juegos ya ven tu cuenta (Cuenta no llegaba al iframe).
// v66: 🫧 Burbujas, el regalo para José Antonio (1 añito).
// v67: 18 juegos clásicos (damas, sudoku, laberinto, hanoi…).
// v68: 16 juegos de acción.
// v69: 16 juegos para peques (ya son 110 juegos en EDTU).
const CACHE = "edtu-v69";
const SHELL = ["./", "./index.html", "./starwars.html", "./wally-kb.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];
// Estas SIEMPRE se piden a la red primero: son las que cambian con cada mejora.
const FRESCOS = [".html", "/"];
// Estas casi nunca cambian: cache primero, que es instantáneo.
const QUIETOS = ["./wally-kb.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// ¿es una página del cuartel (index, starwars, rubik...)?
function esPagina(req) {
  if (req.mode === "navigate") return true;
  const p = new URL(req.url).pathname;
  return FRESCOS.some(x => p.endsWith(x));
}
function esQuieto(req) {
  const p = new URL(req.url).pathname;
  return QUIETOS.some(s => { const q = s.replace("./", ""); return q && p.endsWith(q); });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let mismoSitio = false;
  try { mismoSitio = new URL(req.url).origin === self.location.origin; } catch (err) { return; }
  if (!mismoSitio) return;                       // Supabase, CDNs y demás: directo a la red.

  // Páginas: RED PRIMERO. Así una mejora recién publicada se ve al momento;
  // si no hay conexión, se sirve la copia guardada DE ESA MISMA página.
  if (esPagina(req)) {
    e.respondWith(
      fetch(req).then(r => {
        if (r && r.ok) {
          const copia = r.clone();
          // se guarda cada página bajo SU propia dirección (antes todas se
          // guardaban como index.html, así que abrir el juego sin conexión
          // dejaba el cuartel entero sustituido por el juego)
          caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        }
        return r;
      }).catch(() => caches.match(req).then(c => c || caches.match("./index.html")))
    );
    return;
  }

  // Lo que no cambia: cache primero, y se refresca por detrás para la próxima vez.
  if (esQuieto(req)) {
    e.respondWith(
      caches.match(req).then(c => {
        const red = fetch(req).then(r => {
          if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(x => x.put(req, copia)).catch(() => {}); }
          return r;
        }).catch(() => c);
        return c || red;
      })
    );
  }
});
