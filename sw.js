// Offline cache for the booth screen: the page keeps working if the expo Wi-Fi drops.
const CACHE='laminate-booth-v2';
const PRECACHE=[
  "./",
  "./index.html",
  "./assets/cloud_00.webp",
  "./assets/cloud_01.webp",
  "./assets/cloud_02.webp",
  "./assets/cloud_03.webp",
  "./assets/cloud_04.webp",
  "./assets/cloud_05.webp",
  "./assets/cloud_06.webp",
  "./assets/cloud_07.webp",
  "./assets/cloud_08.webp",
  "./assets/cloud_09.webp",
  "./assets/cloud_10.webp",
  "./assets/cloud_11.webp",
  "./assets/cloud_12.webp",
  "./assets/contour_0.webp",
  "./assets/contour_1.webp",
  "./assets/contour_2.webp",
  "./assets/contour_3.webp",
  "./assets/contour_4.webp",
  "./assets/orange_top.webp",
  "./assets/slice_0.webp",
  "./assets/slice_1.webp",
  "./assets/slice_2.webp",
  "./assets/slice_3.webp",
  "./assets/slice_4.webp",
  "./assets/slice_top_baseline.webp",
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url);
  const font=/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if(url.origin!==location.origin&&!font)return;
  // the page itself: try the network first (so updates show up), fall back to the cached copy after 3 s or when offline
  if(req.mode==='navigate'){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const cached=()=>c.match(req,{ignoreSearch:true}).then(r=>r||c.match('./'));
      try{const r=await Promise.race([fetch(req),new Promise((_,x)=>setTimeout(()=>x('timeout'),3000))]);
        if(r&&r.ok){c.put('./',r.clone());return r} return (await cached())||r}catch(err){return (await cached())||Response.error()}
    }));return;
  }
  // stale-while-revalidate: serve the cached copy instantly, refresh it in the background
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(req,{ignoreSearch:url.origin===location.origin});
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}).catch(()=>hit);
    return hit||net;
  }));
});
