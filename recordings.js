// Existing human recordings, Tabrus / Wikimedia Commons, CC BY-SA 4.0.
// See audio/CREDITS.txt. Letter names are never passed to speech synthesis.
class RecordedLetters {
 constructor(element,onStatus){this.element=element;this.onStatus=onStatus;this.pending=null;this.generation=0;this.letters=[...'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ'];}
 has(letter){return this.letters.includes(letter)}
 stop(){this.generation++;this.element.pause();this.element.removeAttribute('src');this.element.load();if(this.pending){this.pending(false);this.pending=null}this.onStatus('');}
 async play(letter){this.stop();if(!this.has(letter)){this.onStatus('Ь — м’який знак, власного звуку не має.');return false}const token=this.generation;const a=this.element;a.src='audio/'+letter.codePointAt(0).toString(16)+'.mp3';this.onStatus('🔊 '+letter);const ended=new Promise(resolve=>{this.pending=resolve;const finish=ok=>{if(token!==this.generation)return;this.pending=null;this.onStatus(ok?'✓ '+letter:'Не вдалося відтворити запис '+letter);resolve(ok)};a.onended=()=>finish(true);a.onerror=()=>finish(false)});try{await a.play()}catch(e){if(token===this.generation){this.onStatus('Натисни 🔊 ще раз, щоб послухати '+letter);if(this.pending){this.pending(false);this.pending=null}}}return ended}
}
window.RecordedLetters=RecordedLetters;
