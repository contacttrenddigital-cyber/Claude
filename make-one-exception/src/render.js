// usage: node render.js svg outdir width height fps duration [times...]
const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
  const [svgPath,outDir,W,H,fps,dur,...times]=process.argv.slice(2);
  const svg=fs.readFileSync(svgPath,'utf8');
  const w=+W,h=+H;
  const html=`<!doctype html><html><head><style>html,body{margin:0;background:#fff;width:${w}px;height:${h}px;overflow:hidden;display:flex;align-items:center;justify-content:center}svg{width:${Math.round(w*0.84)}px;height:auto}</style></head><body>${svg}</body></html>`;
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
  await p.setContent(html); await p.waitForTimeout(200);
  await p.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));
  const list= times.length? times.map(Number) : Array.from({length:Math.round(+dur*+fps)+1},(_,i)=>i/+fps);
  fs.mkdirSync(outDir,{recursive:true});
  for(let i=0;i<list.length;i++){
    const t=list[i]*1000;
    await p.evaluate(t=>document.getAnimations().forEach(a=>{a.currentTime=t}),t);
    await p.screenshot({path:`${outDir}/f${String(i).padStart(4,'0')}.png`});
  }
  await b.close();
})();
