(function(root){
'use strict';
class Navigation{
 constructor(obstacles=[],bounds={x:25,z:21}){this.obstacles=obstacles;this.bounds=bounds;this.bridges=[{x:15,z:8,w:5.6,h:1.05}];}
 blocked(x,z){if(Math.abs(x)>this.bounds.x||Math.abs(z)>this.bounds.z)return true;return this.obstacles.some(c=>{if(c.kind==='pond'){if(this.bridges.some(b=>Math.abs(x-b.x)<=b.w&&Math.abs(z-b.z)<=b.h))return false;return ((x-c.x)/(c.w+.3))**2+((z-c.z)/(c.h+.3))**2<1}if(c.kind==='circle')return Math.hypot(x-c.x,z-c.z)<c.r+.33;return Math.abs(x-c.x)<c.w+.33&&Math.abs(z-c.z)<c.h+.33})}
 nearest(x,z){x=Math.max(-this.bounds.x,Math.min(this.bounds.x,x));z=Math.max(-this.bounds.z,Math.min(this.bounds.z,z));if(!this.blocked(x,z))return{x,z};for(let r=.5;r<12;r+=.5)for(let i=0;i<32;i++){const a=i*Math.PI/16,nx=x+Math.cos(a)*r,nz=z+Math.sin(a)*r;if(!this.blocked(nx,nz))return{x:nx,z:nz}}return null}
 clear(a,b){const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.18));for(let i=1;i<=n;i++)if(this.blocked(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true}
 path(from,to){const start=this.nearest(from.x,from.z),goal=this.nearest(to.x,to.z);if(!start||!goal)return[];if(this.clear(start,goal))return[goal];const key=(x,z)=>x+','+z;const nearby=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const p={x:Math.round(start.x)+dx,z:Math.round(start.z)+dz};if(!this.blocked(p.x,p.z)&&this.clear(start,p))nearby.push(p)}nearby.sort((a,b)=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z));if(!nearby.length)return[];const sx=nearby[0].x,sz=nearby[0].z,gx=Math.round(goal.x),gz=Math.round(goal.z),open=[{x:sx,z:sz,g:0,f:0}],seen=new Map(),cost=new Map([[key(sx,sz),0]]);let end=null;
 while(open.length){open.sort((a,b)=>a.f-b.f);const p=open.shift(),pk=key(p.x,p.z);if(seen.has(pk))continue;seen.set(pk,p);if(Math.hypot(p.x-goal.x,p.z-goal.z)<1.5&&this.clear(p,goal)){end=p;break}for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(!dx&&!dz)continue;const x=p.x+dx,z=p.z+dz,k=key(x,z);if(seen.has(k)||this.blocked(x,z)||!this.clear(p,{x,z}))continue;const g=p.g+Math.hypot(dx,dz);if(g>=(cost.get(k)??Infinity))continue;cost.set(k,g);open.push({x,z,g,f:g+Math.hypot(x-gx,z-gz),parent:pk})}}
 if(!end)return[];const points=[goal];while(end.parent){points.unshift({x:end.x,z:end.z});end=seen.get(end.parent)}points.unshift({x:end.x,z:end.z});points.unshift(start);const smooth=[];let a=from,i=0;while(i<points.length){let far=i;for(let j=points.length-1;j>=i;j--)if(this.clear(a,points[j])){far=j;break}smooth.push(points[far]);a=points[far];i=far+1}return smooth;
 }
 move(p,dx,dz){const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));let x=p.x,z=p.z;for(let i=0;i<n;i++){if(!this.blocked(x+dx/n,z))x+=dx/n;if(!this.blocked(x,z+dz/n))z+=dz/n}return{x,z}}
}
if(typeof module!=='undefined')module.exports=Navigation;root.Navigation=Navigation;
})(typeof window!=='undefined'?window:globalThis);
