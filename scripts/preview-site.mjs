import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { resolve, relative, isAbsolute, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('../_site/',import.meta.url))
export function previewServer(port=4180) {
 const base='/bltbSch_201.github.io/'
 const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'}
 const server=createServer((req,res)=>{
  let pathname
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
  if(pathname==='/'){res.writeHead(302,{Location:base+'activities.html#event-records'});res.end();return}
  if(!pathname.startsWith(base)){res.writeHead(404);res.end();return}
  let file=resolve(root,pathname.slice(base.length)||'index.html'),rel=relative(root,file)
  if(rel.startsWith('..')||isAbsolute(rel)||!existsSync(file)){res.writeHead(404);res.end();return}
  if(statSync(file).isDirectory())file=resolve(file,'index.html')
  if(!existsSync(file)){res.writeHead(404);res.end();return}
  const size=statSync(file).size,range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
  const headers={'Content-Type':types[extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'}
  let start=0,end=size-1,status=200
  if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),size-1):size-1;if(start> end||start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return}status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+size}
  res.writeHead(status,{...headers,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res)
 })
 return new Promise(done=>server.listen(port,'127.0.0.1',()=>done(server)))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){await previewServer();console.log('活动预览：http://127.0.0.1:4180/bltbSch_201.github.io/activities.html#event-records')}
