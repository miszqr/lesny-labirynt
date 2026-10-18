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
test('both task types and every editable phrase can be drawn; phrases stay stable and do not repeat when alternatives exist',async()=>{
 const h=speechHarness(),g=game({speechHost:h.host});await settle();
 g.run(`window.ForestWolfPhrases=['Uciekaj wilku','Idź do lasu','Zostaw mnie',null,'  ','!!!'];`);
 const drawn=g.run(`(()=>{const types=new Set(),phrases=new Set();let previous=null;for(let i=0;i<200;i++){const e=createWolf(previous);types.add(e.taskType);if(e.taskType==='speech'){phrases.add(e.phrase);if(previous?.taskType==='speech'&&previous.phrase===e.phrase)throw Error('repeat')}previous=e}return {types:[...types],phrases:[...phrases]}})()`);
 assert.deepEqual([...drawn.types].sort(),['jump','speech']);assert.deepEqual([...drawn.phrases].sort(),['Idź do lasu','Uciekaj wilku','Zostaw mnie']);
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
 const r=h.instances[0],lateResult=r.onresult,lateEnd=r.onend;control(g,'speech-fallback').onclick();
 lateResult(results(['Uciekaj wilku',true]));lateEnd();assert.equal(g.run('done.has(pos)'),false);assert.equal(g.run('hearts'),3);
 assert.equal(g.run('encounters[pos].taskType'),'jump');assert.equal(g.$('#dialogue-next').hidden,true);
 const e=g.run('encounters[pos]'),arrows=descendants(g.$('#answers'));
 for(let i=0;i<e.count;i++)arrows.find(b=>b.dataset.wolfDir===String(e.direction)).onclick();control(g,'submit').onclick();
 assert.equal(g.$('#event').open,false);assert.equal(g.run('hearts'),3);
});
