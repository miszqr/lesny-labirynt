// Browser API doubles. These tests do not assert real microphone/browser support.
function speechHarness({ deferred = false, permissionError = null, prefixed = false, unsupported = false, startError = null } = {}) {
  const instances = [], timers = new Map(); let timerId = 0, permissionCalls = 0, stoppedTracks = 0, resolvePermission, rejectPermission;
  const stream = { getTracks: () => [0,1].map(() => ({ stop() { stoppedTracks++; } })) };
  const waiting = deferred ? new Promise((resolve,reject) => { resolvePermission=resolve;rejectPermission=reject; }) : null;
  class Recognition {
    constructor() { this.starts=0;this.aborts=0;instances.push(this); }
    start() { this.starts++; if(startError)throw Object.assign(new Error(startError), {name:startError}); }
    abort() { this.aborts++; }
  }
  const host = { isSecureContext: true, navigator: { mediaDevices: { getUserMedia(options) {
    permissionCalls++; if(JSON.stringify(options)!=='{"audio":true}')throw new Error('Unexpected media request');
    if(deferred)return waiting;
    return permissionError?Promise.reject(Object.assign(new Error(permissionError), {name:permissionError})):Promise.resolve(stream);
  } } }, setTimeout(fn) { const id=++timerId;timers.set(id,fn);return id; }, clearTimeout(id) { timers.delete(id); } };
  if(!unsupported)host[prefixed?'webkitSpeechRecognition':'SpeechRecognition']=Recognition;
  return {host,instances,timers,get permissionCalls(){return permissionCalls},get stoppedTracks(){return stoppedTracks},
    grant(){resolvePermission(stream)},deny(){rejectPermission({name:'NotAllowedError'})},
    timeout(){[...timers.values()].forEach(fn=>fn())}};
}
const results = (...segments) => ({results:segments.map(([text,final=true])=>Object.assign([{transcript:text}],{isFinal:final})),resultIndex:0});
const settle = () => new Promise(resolve=>setImmediate(resolve));
module.exports={speechHarness,results,settle};
