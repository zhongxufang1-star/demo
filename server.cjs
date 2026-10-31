const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'dist'),port=Number(process.argv[2]||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
  if(req.url==='/__health'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('time-poverty-demo-v7');return;}
  let filename;try{filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400);res.end('Bad request');return;}
  if(filename!==root&&!filename.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  if(filename===root)filename=path.join(root,'index.html');
  fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});
});
server.on('error',err=>{console.error(err.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${server.address().port}`;
  console.log(`Local: ${url} (Ctrl+C to stop)`);
  // Open only after the server is ready. This avoids a first-launch connection error.
  if(process.argv.includes('--open')&&process.platform==='win32')require('node:child_process').execFile('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true},err=>{if(err)console.log(`Open this URL in your browser: ${url}`);});
});
