// Match Netlify's case-insensitive static asset URLs for the downloaded snapshot.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve('.codex-deploy-photo-video/release');
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.mp4':'video/mp4'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');let target=path.resolve(root,'.'+decodeURIComponent(url.pathname).toLowerCase());
 if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 if(!fs.existsSync(target)||!fs.statSync(target).isFile())target=path.join(root,'index.html');
 res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(target).pipe(res);
}).listen(8182,'127.0.0.1',()=>console.log('Scoped release preview: http://127.0.0.1:8182'));
