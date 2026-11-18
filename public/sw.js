/* MovieNight offline shell v2: never cache auth, APIs or build assets. */
const CACHE="movienight-offline-v2";
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.add("/offline.html")));
 self.skipWaiting();
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
 self.clients.claim();
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET"||new URL(request.url).origin!==self.location.origin)return;
 if(request.mode!=="navigate")return;
 event.respondWith(fetch(request).catch(async()=>await caches.match("/offline.html")||Response.error()));
});
