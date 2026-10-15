const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/recordings.js','utf8'),context);
const Audio=context.window.RecordedLetters;
async function main(){
 const el={src:'',pause(){},load(){},removeAttribute(){this.src=''},play(){return Promise.resolve()}};
 let status='';const a=new Audio(el,s=>status=s);
 assert.equal(a.letters.length,32);assert(!a.has('Ь'));assert(a.has('Ґ'));
 let p=a.play('А');assert.equal(el.src,'audio/410.mp3');el.onended();assert.equal(await p,true);
 p=a.play('М');a.stop();assert.equal(await p,false);assert.equal(el.src,'');
 p=a.play('Б');const stale=el.onended;const next=a.play('В');assert.equal(await p,false);stale();assert.equal(status,'🔊 В');el.onended();assert.equal(await next,true);
 p=a.play('О');el.onerror();assert.equal(await p,false);assert(status.includes('Не вдалося'));
 assert.equal(await a.play('Ь'),false);assert(status.includes('власного звуку'));
 el.play=()=>Promise.reject(new Error('autoplay'));assert.equal(await a.play('У'),false);assert(status.includes('Натисни'));
 console.log('PASS: 32 human recording mappings, ended/error, cancellation, stale callbacks, soft sign and autoplay rejection.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
