const assert=require('node:assert/strict'),C=require('./core');
const s=C.fresh();assert(C.unlocked(s,'hear',false));
for(let i=0;i<100;i++){const t=C.task(s,'hear');assert(t.options.includes(t.target));assert.equal(new Set(t.options).size,3);assert(!t.options.includes('Ь'))}
C.record(s,'hear','А',true);assert.equal(s.independent,0);C.record(s,'hear','А',false);assert.equal(s.independent,1);assert.equal(s.letterScores.А,1);
s.independent=1000;for(let i=0;i<500;i++)assert(!C.task(s,'hear').options.includes('Ь'));
assert(C.finish(s,{mode:'hear'}));assert(C.valid(s));console.log('PASS: hearing available without TTS, options, soft sign exclusion, hint scoring and save compatibility.');
