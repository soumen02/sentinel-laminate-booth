// Offline cache for the booth screen: both pages keep working if the expo Wi-Fi drops.
const CACHE='laminate-booth-v4';
const PRECACHE=['./', './index.html', './demos.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './assets/cloud_00.webp', './assets/cloud_01.webp', './assets/cloud_02.webp', './assets/cloud_03.webp', './assets/cloud_04.webp', './assets/cloud_05.webp', './assets/cloud_06.webp', './assets/cloud_07.webp', './assets/cloud_08.webp', './assets/cloud_09.webp', './assets/cloud_10.webp', './assets/cloud_11.webp', './assets/cloud_12.webp', './assets/contour_0.webp', './assets/contour_1.webp', './assets/contour_2.webp', './assets/contour_3.webp', './assets/contour_4.webp', './assets/orange_top.webp', './assets/slice_0.webp', './assets/slice_1.webp', './assets/slice_2.webp', './assets/slice_3.webp', './assets/slice_4.webp', './assets/slice_top_baseline.webp', './videos/cv-1-lesion.webm', './videos/cv-1-lesion.webp', './videos/cv-2-navigate.webm', './videos/cv-2-navigate.webp', './videos/cv-3-central-vein.webm', './videos/cv-3-central-vein.webp', './videos/lv-1-mask.webm', './videos/lv-1-mask.webp', './videos/lv-2-timepoints.webm', './videos/lv-2-timepoints.webp', './videos/lv-3-new-lesions.webm', './videos/lv-3-new-lesions.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// <video> asks for byte ranges; answer them from the cached file so playback works offline
async function rangeResponse(req,res){
  const range=req.headers.get('range'); if(!range||!res)return res;
  const buf=await res.arrayBuffer(); const m=/bytes=(\d*)-(\d*)/.exec(range)||[];
  const start=m[1]?+m[1]:0, end=m[2]?Math.min(+m[2],buf.byteLength-1):buf.byteLength-1;
  return new Response(buf.slice(start,end+1),{status:206,statusText:'Partial Content',headers:{
    'Content-Type':res.headers.get('Content-Type')||'video/webm','Content-Range':`bytes ${start}-${end}/${buf.byteLength}`,
    'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url);
  const font=/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if(url.origin!==location.origin&&!font)return;
  // pages: network first (so updates show up), cached copy after 3 s or when offline
  if(req.mode==='navigate'){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const key=url.pathname.endsWith('demos.html')?'./demos.html':'./';
      const cached=()=>c.match(req,{ignoreSearch:true}).then(r=>r||c.match(key));
      try{const r=await Promise.race([fetch(req),new Promise((_,x)=>setTimeout(()=>x('timeout'),3000))]);
        if(r&&r.ok){c.put(key,r.clone());return r} return (await cached())||r}catch(err){return (await cached())||Response.error()}
    }));return;
  }
  // videos: cached file sliced to the requested range
  if(/\.(webm|mp4)$/.test(url.pathname)){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match(url.pathname.replace(/^.*\/videos\//,'./videos/'))||await c.match(req.url);
      if(hit)return rangeResponse(req,hit);
      return fetch(req);
    }));return;
  }
  // everything else: stale-while-revalidate
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(req,{ignoreSearch:url.origin===location.origin});
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}).catch(()=>hit);
    return hit||net;
  }));
});
