const http=require('http'),fs=require('fs'),path=require('path'),os=require('os');
const root=__dirname,port=Number(process.env.PORT)||8088;
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
function handler(req,res){
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end()}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch(e){res.writeHead(400);return res.end()}
 if(pathname.includes('\0')){res.writeHead(400);return res.end()}
 const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':'')),rel=path.relative(root,file),ext=path.extname(file);
 if(rel.startsWith('..')||path.isAbsolute(rel)||rel.startsWith('tools'+path.sep)||!mime[ext]){res.writeHead(403);return res.end('Forbidden')}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found')}
 const headers={'Content-Type':mime[ext],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
 let start=0,end=stat.size-1,status=200;
 if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});return res.end()}
 if(!m[1])start=Math.max(0,stat.size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]))}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});return res.end()}
 status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+stat.size;}
 headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(req.method==='HEAD'||!stat.size)return res.end();const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);res.on('close',()=>stream.destroy());
 });
}
if(require.main===module){const server=http.createServer(handler);server.on('error',e=>{console.error('Cannot start server:',e.message);process.exitCode=1});server.listen(port,'0.0.0.0',()=>{console.log('Bukvomisto: http://localhost:'+port);for(const list of Object.values(os.networkInterfaces()))for(const n of list||[])if(n.family==='IPv4'&&!n.internal)console.log('Tablet (same Wi-Fi): http://'+n.address+':'+port);console.log('Stop: Ctrl+C. Local trusted network only.');if(process.argv.includes('--open'))require('child_process').execFile('rundll32.exe',['url.dll,FileProtocolHandler','http://localhost:'+port],{windowsHide:true},()=>{})})}
module.exports={handler};
