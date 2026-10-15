const assert=require('assert/strict'),Navigation=require('./navigation.js');
const obstacles=[{x:-16,z:-10,w:3,h:2.7},{x:0,z:-12,w:3,h:2.7},{x:16,z:-10,w:3,h:2.7},{kind:'pond',x:15,z:8,w:4.5,h:3.8},{kind:'circle',x:-22,z:-1,r:.4}];
const nav=new Navigation(obstacles);assert(nav.blocked(26,0));assert(nav.blocked(0,-12));assert(!nav.blocked(15,8),'bridge must be walkable');assert(nav.blocked(15,5),'water outside bridge must block');
for(const from of [{x:0,z:10},{x:-24,z:20},{x:23,z:-18}])for(const goal of [{x:-24,z:-18},{x:22,z:20},{x:0,z:-17},{x:16,z:-6},{x:15,z:8},{x:-16,z:-10}]){const route=nav.path(from,goal);assert(route.length,'route exists');let p=from;for(const point of route){assert(!nav.blocked(point.x,point.z));assert(nav.clear(p,point),'route segment cannot cross collider');p=point}}
let p={x:0,z:-7};for(let i=0;i<60;i++)p=nav.move(p,0,-.2);assert(p.z>-9,'cannot walk through house');p={x:9,z:8};for(let i=0;i<60;i++)p=nav.move(p,.2,0);assert(p.x>20,'bridge crossing');
for(const dt of [1/60,1/30,1/10]){let p={x:0,z:0};for(let t=0;t<2-1e-5;t+=dt)p=nav.move(p,6.4*dt,0);assert(Math.abs(p.x-12.8)<.01,'movement independent of FPS')}
assert.deepEqual(nav.nearest(100,100),{x:25,z:21});
let seed=1847;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
for(let i=0;i<500;i++){const a=nav.nearest(rnd()*48-24,rnd()*40-20),b=nav.nearest(rnd()*48-24,rnd()*40-20),route=nav.path(a,b);assert(route.length,'random reachable route '+i);let prev=a;for(const p of route){assert(nav.clear(prev,p),'random route collision '+i);prev=p}}
console.log('PASS: 500 seeded routes, wall-adjacent starts, free movement, frame-rate independence, edges, collisions and bridge.');
