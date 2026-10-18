const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {game}=require('./helpers/game.cjs');
const {speechHarness,results,settle}=require('./helpers/speech.cjs');
const root=process.env.GAME_ROOT||path.resolve(__dirname,'..');
function controller(h){const context=vm.createContext({window:h.host});vm.runInContext(fs.readFileSync(path.join(root,'speech.js'),'utf8'),context);return h.host.ForestSpeech.create(h.host)}
const descendants=node=>[node,...node.children.flatMap(descendants)];
const control=(g,action)=>descendants(g.$('#dialogue-actions')).find(b=>b.dataset.wolfAction===action);
const status=g=>descendants(g.$('#answers')).find(n=>n.className==='speech-status').textContent;
function encounter(g,mode='map'){
 g.run(`closeEvent();pos=Number(Object.keys(encounters).find(id=>isEnemy(encounters[id])));viewMode='${mode}';Object.assign(encounters[pos],{taskType:'speech',phrase:'Uciekaj wilku',text:'Powiedz: „Uciekaj wilku”.'});render();showEvent()`);
 g.$('#dialogue-next').onclick();
}

test('startup requests audio once, releases every track and never starts recognition',async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();
 assert.equal(h.permissionCalls,1);assert.equal(h.stoppedTracks,2);assert.equal(h.instances.length,0);
 assert.equal(g.run('wolfSpeech.permission'),'granted');
 g.run('start();start();wolfSpeech.requestPermission()');await settle();assert.equal(h.permissionCalls,1);
});
test('the first generated wolf always offers speech, including after a new game',async()=>{
 for(const seed of [1,2,3,10,42,123,999]){
  const h=speechHarness(),g=game({speechHost:h.host,seed});await settle();
  assert.equal(g.run('Object.values(encounters).find(isEnemy).taskType'),'speech');
  g.run('closeEvent();pos=Number(Object.keys(encounters).find(id=>isEnemy(encounters[id])));render();showEvent()');
  g.$('#dialogue-next').onclick();
  assert.equal(g.$('#description').textContent,`Powiedz: „${g.run('encounters[pos].phrase')}”.`);
  assert.equal(control(g,'speak').disabled,false);assert.equal(control(g,'submit'),undefined);
  g.run('start()');assert.equal(g.run('Object.values(encounters).find(isEnemy).taskType'),'speech');
  assert.equal(h.instances.length,0,'permission does not start listening');assert.equal(h.permissionCalls,1);
 }
});
test('granting the startup permission later enables speech on the existing first wolf',async()=>{
 const h=speechHarness({deferred:true}),g=game({speechHost:h.host});await settle();
 assert.equal(g.run('Object.values(encounters).find(isEnemy).taskType'),'speech');
 g.run('closeEvent();pos=Number(Object.keys(encounters).find(id=>isEnemy(encounters[id])));render();showEvent()');
 g.$('#dialogue-next').onclick();assert.equal(control(g,'speak').disabled,true);
 const e=g.run('encounters[pos]');h.grant();await settle();
 assert.equal(g.run('encounters[pos]'),e);assert.equal(control(g,'speak').disabled,false);
 assert.equal(control(g,'speak').textContent,'🎤 Mówię');assert.equal(h.stoppedTracks,2);
 control(g,'speak').onclick();assert.equal(h.instances.length,1);
 h.instances[0].onresult(results([e.phrase,true]));h.instances[0].onend();assert.equal(g.$('#event').open,false);
 assert.equal(g.run('hearts'),3);
});
test('an unanswered permission prompt does not block the game or the arrow alternative',async()=>{
 const h=speechHarness({deferred:true}),g=game({speechHost:h.host});await settle();encounter(g);
 assert.equal(control(g,'speak').disabled,true);control(g,'speech-fallback').onclick();
 assert.equal(g.run('encounters[pos].taskType'),'jump');assert.equal(g.run('hearts'),3);assert.equal(g.$('#event').open,true);
 assert.equal(g.$('#dialogue-next').hidden,true);assert.equal(h.instances.length,0);
 h.grant();await settle();assert.equal(h.stoppedTracks,2);assert.equal(g.run('encounters[pos].taskType'),'jump');
});
for(const error of ['NotAllowedError','NotFoundError','NotReadableError'])test(`startup ${error}: no rejected promise, usable jump fallback`,async()=>{
 const h=speechHarness({permissionError:error}),g=game({speechHost:h.host});await settle();encounter(g);
 assert.match(status(g),/mikrofon|Mikrofon/);control(g,'speech-fallback').onclick();
 assert.equal(g.run('encounters[pos].taskType'),'jump');assert.equal(g.run('done.has(pos)'),false);assert.equal(h.instances.length,0);
 assert.equal(g.run('createWolf().taskType'),'jump');
});
test('missing API/insecure contexts use jumps without asking for an unusable microphone',async()=>{
 for(const options of [{unsupported:true},{}]){
  const h=speechHarness(options);if(!options.unsupported)h.host.isSecureContext=false;
  const g=game({speechHost:h.host});await settle();assert.equal(h.permissionCalls,0);
  assert.equal(g.run('createWolf().taskType'),'jump');assert.equal(g.run('wolfSpeech.supported'),false);
 }
});
test('phrase normalization keeps Polish letters and requires the complete phrase',()=>{
 const c=controller(speechHarness());assert.equal(c.normalize('  UCIEKAJ, WILKU! '),'uciekaj wilku');
 assert.notEqual(c.normalize('Idź już'),c.normalize('Idz juz'));
 assert.notEqual(c.normalize('nie uciekaj wilku'),c.normalize('uciekaj wilku'));
});
test('all encounters use speech when available, drawing every editable phrase without consecutive repeats',async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();
 g.run(`window.ForestWolfPhrases=['Uciekaj wilku','Idź do lasu','Zostaw mnie',null,'  ','!!!'];`);
 const drawn=g.run(`(()=>{const types=new Set(),phrases=new Set();let previous=null;for(let i=0;i<200;i++){const e=createWolf(previous);types.add(e.taskType);if(e.taskType==='speech'){phrases.add(e.phrase);if(previous?.taskType==='speech'&&previous.phrase===e.phrase)throw Error('repeat')}previous=e}return {types:[...types],phrases:[...phrases]}})()`);
 assert.deepEqual([...drawn.types],['speech']);assert.deepEqual([...drawn.phrases].sort(),['Idź do lasu','Uciekaj wilku','Zostaw mnie']);
 encounter(g);const phrase=g.run('encounters[pos].phrase');g.run('render();showEvent()');assert.equal(g.run('encounters[pos].phrase'),phrase);
 g.run('window.ForestWolfPhrases=[]');assert.equal(g.run('createWolf().taskType'),'jump');
});
for(const mode of ['map','fpv'])test(`${mode}: only final complete speech moves the wolf, once, without a heart`,async()=>{
 const h=speechHarness({prefixed:mode==='fpv'}),g=game({speechHost:h.host});await settle();encounter(g,mode);
 const cell=g.run('pos'),hearts=g.run('hearts'),speak=control(g,'speak');
 assert.equal(g.$('#dialogue-next').hidden,true);speak.onclick();speak.onclick();assert.equal(h.instances.length,1);
 const r=h.instances[0],oldResult=r.onresult,oldEnd=r.onend;
 assert.equal(r.lang,'pl-PL');assert.equal(r.continuous,false);r.onstart();
 r.onresult(results(['Uciekaj wilku',false]));assert.equal(g.run('done.has(pos)'),false);
 r.onresult(results(['UCIEKAJ,',true],[' WILKU!',true]));r.onresult(results(['UCIEKAJ,',true],[' WILKU!',true]));
 assert.equal(g.$('#event').open,true,'final speech waits for recognition to end');r.onend();
 assert.equal(g.$('#event').open,false);assert.equal(g.run('hearts'),hearts);assert.equal(g.run('encounters[pos]'),undefined);
 assert.equal(g.run('Object.values(encounters).filter(isEnemy).length'),1);assert.equal(g.run('pos'),cell);
 const after=g.run('JSON.stringify(encounters)');oldResult(results(['Uciekaj wilku',true]));oldEnd();speak.onclick();
 assert.equal(g.run('JSON.stringify(encounters)'),after);assert.equal(g.run('hearts'),hearts);assert.equal(h.instances.length,1);
 assert.equal(h.timers.size,0);assert.equal(r.aborts,1);
});
test('a wrong/partial phrase allows another attempt without losing a heart',async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();encounter(g);const e=g.run('encounters[pos]');
 for(const text of ['Uciekaj','Nie uciekaj wilku']){
  control(g,'speak').onclick();const r=h.instances.at(-1);r.onresult(results([text,true]));r.onend();
  assert.equal(g.$('#event').open,true);assert.equal(g.run('encounters[pos]'),e);assert.equal(g.run('hearts'),3);
  assert.equal(control(g,'speak').disabled,false);assert.match(status(g),/Spróbuj jeszcze raz/);
 }
});
for(const error of ['no-speech','network','audio-capture','not-allowed','service-not-allowed'])test(`recognition ${error} recovers and does not solve the task`,async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();encounter(g);control(g,'speak').onclick();const r=h.instances[0],lateEnd=r.onend;
 r.onresult(results(['Uciekaj wilku',true]));r.onerror({error});lateEnd();
 assert.equal(g.run('done.has(pos)'),false);assert.equal(g.run('hearts'),3);assert.equal(g.$('#event').open,true);
 assert.equal(g.run('wolfSpeech.listening'),false);control(g,'speech-fallback').onclick();assert.equal(g.run('encounters[pos].taskType'),'jump');
});
test('synchronous start failure and missing end events cannot leave listening stuck',async()=>{
 for(const options of [{startError:'InvalidStateError'},{}]){
  const h=speechHarness(options),c=controller(h),updates=[];await c.requestPermission();c.start(e=>updates.push(e));
  if(!options.startError)h.timeout();assert.equal(c.listening,false);assert.equal(updates.at(-1).state,'error');assert.equal(h.timers.size,0);
 }
});
test('permission can be retried after changing site settings',async()=>{
 const h=speechHarness({permissionError:'NotAllowedError'}),c=controller(h);await c.requestPermission();assert.equal(c.permission,'denied');
 h.host.navigator.mediaDevices.getUserMedia=()=>Promise.resolve({getTracks:()=>[]});await c.requestPermission(true);
 assert.equal(c.permission,'granted');assert.equal(c.start(()=>{}),true);c.cancel();
});
for(const action of ['start()','render();showEvent()',"setView('fpv')",'closeEvent()'])test(`${action}: cancels microphone and ignores old results`,async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();encounter(g);control(g,'speak').onclick();
 const r=h.instances[0],lateResult=r.onresult,lateEnd=r.onend;g.run(action);const snapshot=g.run('JSON.stringify({pos,hearts,encounters})');
 lateResult(results(['Uciekaj wilku',true]));lateEnd();assert.equal(g.run('JSON.stringify({pos,hearts,encounters})'),snapshot);
 assert.equal(g.run('wolfSpeech.listening'),false);assert.equal(r.aborts,1);assert.equal(h.timers.size,0);
});
test('background/page exit releases recognition and lets the player retry',async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();encounter(g);
 control(g,'speak').onclick();g.run('document.hidden=true');g.events.visibilitychange();
 assert.equal(h.instances[0].aborts,1);assert.equal(control(g,'speak').disabled,false);
 g.run('document.hidden=false');control(g,'speak').onclick();g.windowEvents.pagehide();assert.equal(h.instances[1].aborts,1);
 assert.equal(g.run('hearts'),3);
});
test('switching to arrows cancels speech; a late successful result cannot bypass the new task',async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();encounter(g);control(g,'speak').onclick();
 const r=h.instances[0],lateResult=r.onresult,lateEnd=r.onend;r.onerror({error:'network'});control(g,'speech-fallback').onclick();
 lateResult(results(['Uciekaj wilku',true]));lateEnd();assert.equal(g.run('done.has(pos)'),false);assert.equal(g.run('hearts'),3);
 assert.equal(g.run('encounters[pos].taskType'),'jump');assert.equal(g.$('#dialogue-next').hidden,true);
 const e=g.run('encounters[pos]'),arrows=descendants(g.$('#answers'));
 for(let i=0;i<e.count;i++)arrows.find(b=>b.dataset.wolfDir===String(e.direction)).onclick();control(g,'submit').onclick();
 assert.equal(g.$('#event').open,false);assert.equal(g.run('hearts'),3);
});


test('default phrase list contains exactly the three requested separate phrases',()=>{
 const g=game();assert.deepEqual([...g.run('wolfPhrases()')],['Uciekaj wilku','Zmykaj wilku','Idź sobie']);
});
test('working microphone hides and disables the arrow fallback, including after a wrong phrase',async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();encounter(g);
 const fallback=control(g,'speech-fallback');assert.equal(fallback.hidden,true);
 fallback.onclick();assert.equal(g.run('encounters[pos].taskType'),'speech');
 control(g,'speak').onclick();fallback.onclick();assert.equal(g.run('encounters[pos].taskType'),'speech');
 h.instances[0].onresult(results(['Inne słowa',true]));h.instances[0].onend();
 assert.equal(fallback.hidden,true);fallback.onclick();assert.equal(g.run('encounters[pos].taskType'),'speech');
 control(g,'speak').onclick();h.instances[1].onerror({error:'audio-capture'});
 assert.equal(fallback.hidden,false);fallback.onclick();assert.equal(g.run('encounters[pos].taskType'),'jump');
 assert.equal(g.run('hearts'),3);
});
test('a recovered microphone changes an earlier automatic jump task to speech',async()=>{
 const h=speechHarness({permissionError:'NotAllowedError'}),g=game({speechHost:h.host});await settle();
 g.run('start();closeEvent();pos=Number(Object.keys(encounters).find(id=>isEnemy(encounters[id])));render();showEvent()');
 g.$('#dialogue-next').onclick();assert.equal(g.run('encounters[pos].taskType'),'jump');
 h.host.navigator.mediaDevices.getUserMedia=()=>Promise.resolve({getTracks:()=>[]});g.run('wolfSpeech.requestPermission(true)');await settle();
 assert.equal(g.run('encounters[pos].taskType'),'speech');assert.equal(control(g,'speak').disabled,false);
 assert.equal(control(g,'speech-fallback').hidden,true);assert.match(g.$('#description').textContent,/^Powiedz:/);
});
for(const mode of ['map','fpv'])test(`${mode}: repeated encounters never draw arrows with a working microphone`,async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();let previous=null;
 for(let i=0;i<9;i++){
  g.run(`closeEvent();pos=Number(Object.keys(encounters).find(id=>isEnemy(encounters[id])));viewMode='${mode}';render();showEvent()`);
  g.$('#dialogue-next').onclick();const e=g.run('encounters[pos]');assert.equal(e.taskType,'speech');assert.notEqual(e.phrase,previous);
  assert.equal(control(g,'speech-fallback').hidden,true);control(g,'speak').onclick();const r=h.instances.at(-1);
  r.onresult(results([e.phrase,true]));r.onend();assert.equal(g.$('#event').open,false);assert.equal(g.run('hearts'),3);previous=e.phrase;
 }
});


test('matching accepts whole phrase prefixes, but rejects partial words, earlier words and empty phrases',()=>{
 const c=controller(speechHarness());
 const examples=[
  ['Uciekaj wilku','Uciekaj wilku',true],
  ['  UCIEKAJ, WILKU! Do lasu.  ','Uciekaj wilku',true],
  ['Zmykaj wilku i idź sobie','Zmykaj wilku',true],
  ['Idź sobie stąd','Idź sobie',true],
  ['Uciekaj wilkuś','Uciekaj wilku',false],
  ['Zmykaj wilkuś do lasu','Zmykaj wilku',false],
  ['Idź sobieski','Idź sobie',false],
  ['Nie uciekaj wilku','Uciekaj wilku',false],
  ['Proszę idź sobie','Idź sobie',false],
  ['Uciekaj','Uciekaj wilku',false],
  ['Idz sobie stąd','Idź sobie',false],
  ['', 'Uciekaj wilku',false],
  ['Cokolwiek','',false],
  ['Cokolwiek','!!!',false],
 ];
 for(const [spoken,phrase,accepted] of examples)assert.equal(c.matchesPhrase(spoken,phrase),accepted,JSON.stringify({spoken,phrase}));
});
for(const [phrase,spoken] of [['Uciekaj wilku','Uciekaj wilku do lasu'],['Zmykaj wilku','Zmykaj wilku i idź sobie'],['Idź sobie','Idź sobie stąd']])test(`a longer utterance beginning with ${phrase} completes the wolf once, only when final`,async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();encounter(g);
 g.run(`encounters[pos].phrase=${JSON.stringify(phrase)};encounters[pos].text='Powiedz: '+encounters[pos].phrase;render();showEvent()`);
 control(g,'speak').onclick();const r=h.instances.at(-1),lateEnd=r.onend;
 r.onresult(results([spoken,false]));assert.equal(g.$('#event').open,true);assert.equal(g.run('done.has(pos)'),false);
 r.onresult(results([spoken,true]));r.onend();assert.equal(g.$('#event').open,false);assert.equal(g.run('hearts'),3);
 const state=g.run('JSON.stringify(encounters)');lateEnd();assert.equal(g.run('JSON.stringify(encounters)'),state);
});
