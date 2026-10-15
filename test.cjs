const assert=require('assert/strict');const C=require('./core.js');
let s=C.fresh();assert(C.valid(s));assert.equal(C.LETTERS.length,33);assert.equal(new Set(C.LETTERS).size,33);assert.deepEqual(C.active(s),['А','О','У']);
for(let i=0;i<100;i++){const t=C.task(s,'letters');assert(t.options.includes(t.target));assert.equal(new Set(t.options).size,3)}
C.record(s,'letters','А',true);assert.equal(s.independent,0);C.record(s,'letters','А',false);assert.equal(s.independent,1);assert.equal(s.letterScores.А,1);assert(!C.unlocked(s,'syllables',true));
for(let i=0;i<11;i++)C.record(s,'letters','М',false);assert(C.unlocked(s,'syllables',false));assert(!C.unlocked(s,'listen',true));s.listening=true;assert(C.unlocked(s,'listen',true));assert(!C.unlocked(s,'listen',false));
const r={mode:'letters',rewarded:false};assert(C.finish(s,r));assert(!C.finish(s,r));assert.equal(s.gems,3);assert(C.build(s,0,'flowers'));assert.equal(s.gems,0);assert(!C.build(s,0,'flowers'));assert(!C.build(s,1,'house'));assert(C.remove(s,0));assert.equal(s.gems,3);assert(!C.remove(s,0));assert(C.valid(s));
for(const w of C.WORDS)for(const p of w.parts)assert(C.SYLLABLES.includes(p));
const beginner=C.fresh();beginner.syllableScores={МА:2};for(let i=0;i<20;i++)assert.equal(C.task(beginner,'words').target,'МАМА');
for(let i=0;i<3;i++)C.finish(s,{mode:'syllables'});assert(C.unlocked(s,'words',false));
for(const mode of ['pairs','syllables','listen','words'])for(let i=0;i<20;i++){const t=C.task(s,mode);if(mode==='pairs'){assert.equal(t.options.length,6);for(const l of new Set(t.options))assert.equal(t.options.filter(x=>x===l).length,2)}if(mode==='syllables')assert.deepEqual([...t.target].sort(),[...t.options].sort());if(mode==='words')assert.equal(t.parts.join(''),t.target);if(mode==='listen')assert(t.options.includes(t.target))}
for(const patch of [{gems:-1},{gems:NaN},{buildings:['flowers']},{version:1},{letterScores:{X:3}},{listening:'true'},{modeRuns:{evil:1}},{color:'javascript:bad'}])assert(!C.valid({...s,...patch}));
const fs=require('fs');for(const file of ['core.js','world.js','app.js','sw.js'])new Function(fs.readFileSync(require('path').join(__dirname,file),'utf8'));console.log('PASS: alphabet, progression, hints, unlocks, task generation, reward idempotence, purchases, refunds, save validation and JS syntax.');
