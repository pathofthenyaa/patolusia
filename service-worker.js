const CACHE="mini-gry-v2.6";
const ASSETS=["./","./index.html","./css/app.css","./js/app.js","./games/sudoku.html","./games/battleships.html","./games/go.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(ASSETS.map(x=>new Request(x,{cache:"reload"})));await self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("mini-gry-")&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 if(u.origin!==location.origin)return;
 e.respondWith((async()=>{
   try{
     const fresh=await fetch(e.request,{cache:"no-store"});
     if(fresh&&fresh.ok){const c=await caches.open(CACHE);c.put(e.request,fresh.clone())}
     return fresh;
   }catch(err){
     return (await caches.match(e.request)) || (e.request.mode==="navigate" ? await caches.match("./index.html") : Response.error());
   }
 })());
});