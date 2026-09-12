// Run from the repository root: node scripts/verify-voice-input.mjs
// Deterministic lifecycle simulation; browser microphone and live API checks remain manual.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const compile = path => ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const deferred = () => { let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}; };
const flush = () => new Promise(resolve=>setImmediate(resolve));
function harness() {
  let index=0; const slots=[]; const effects=[]; const permissions=[]; const recorders=[]; const requests=[]; const timers=new Map(); let timerId=0;
  const react={useState(initial){const i=index++; if(!(i in slots))slots[i]=initial; return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(initial){const i=index++;return slots[i]??=( {current:initial})},useCallback(fn){index++;return fn},useEffect(fn){index++;if(!effects.length)effects.push(fn)}};
  class Recorder {
    static isTypeSupported(t){return t.startsWith('audio/webm')}
    constructor(stream,opts){this.stream=stream;this.mimeType=opts?.mimeType||'audio/webm';this.state='inactive';recorders.push(this)}
    start(){this.state='recording'}
    stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['audio'],{type:this.mimeType})});this.onstop?.()})}
  }
  const context={exports:{},require:id=>{assert.equal(id,'react');return react},navigator:{mediaDevices:{getUserMedia(){const d=deferred();permissions.push(d);return d.promise}}},MediaRecorder:Recorder,Blob,FormData,DOMException,AbortController,fetch:(_url,opts)=>{const d=deferred();requests.push({...d,opts});return d.promise},setTimeout:(f,ms)=>{timers.set(++timerId,{f,ms});return timerId},clearTimeout:id=>timers.delete(id),setInterval:()=>++timerId,clearInterval:()=>{}};
  vm.runInNewContext(compile('hooks/use-voice-input.ts'),context);
  const render=()=>{index=0;return context.exports.useVoiceInput()};
  render(); let cleanup=effects[0](); cleanup(); cleanup=effects[0](); // React StrictMode effect replay
  return {render,permissions,recorders,requests,timers,cleanup};
}
function stream(){const track={stops:0,stop(){this.stops++}};return {track,getTracks:()=>[track]}}
(async()=>{
  let h=harness(), v=h.render(); const p=v.startListening();v.startListening();assert.equal(h.permissions.length,1,'duplicate starts gated synchronously');const s=stream();h.permissions[0].resolve(s);await p;assert.equal(h.render().status,'recording','StrictMode replay remains usable');h.render().cancelListening();await flush();assert.equal(s.track.stops,1);assert.equal(h.requests.length,0);h.cleanup();
  h=harness();const old=h.render().startListening();h.render().cancelListening();const newer=h.render().startListening();const newerStream=stream();h.permissions[1].resolve(newerStream);await newer;h.permissions[0].reject(new DOMException('denied','NotAllowedError'));await old;assert.equal(newerStream.track.stops,0,'stale permission rejection must not stop new mic');h.cleanup();
  h=harness();const pending=h.render().startListening();h.render().cancelListening();const late=stream();h.permissions[0].resolve(late);await pending;assert.equal(late.track.stops,1,'late permission stream released');assert.equal(h.recorders.length,0);h.cleanup();
  h=harness();const begin=h.render().startListening();h.permissions[0].resolve(stream());await begin;const rec=h.recorders[0];const oldStop=rec.onstop,oldData=rec.ondataavailable;h.render().cancelListening();const begin2=h.render().startListening();const s2=stream();h.permissions[1].resolve(s2);await begin2;oldData({data:new Blob(['stale'])});oldStop();assert.equal(s2.track.stops,0);assert.equal(h.requests.length,0);h.render().stopListening();await flush();assert.equal(h.requests.length,1);h.render().reset();h.render().setTranscript('new typed question');h.requests[0].resolve(Response.json({text:'stale transcript'}));await flush();await flush();assert.equal(h.render().transcript,'new typed question');h.cleanup();
  h=harness();const auto=h.render().startListening();const autoStream=stream();h.permissions[0].resolve(autoStream);await auto;[...h.timers.values()].find(t=>t.ms===20000).f();await flush();assert.equal(h.requests.length,1);assert.equal(autoStream.track.stops,1);h.requests[0].resolve(Response.json({text:' Where is milk? '}));await flush();await flush();assert.equal(h.render().transcript,'Where is milk?');assert.equal(h.render().canRetry,false);h.cleanup();
  console.log('PASS controller simulation: StrictMode effect replay, duplicate activation, permission cancellation/resolution/rejection, late recorder events, stale transcription, 20-second stop, track cleanup, successful transcript.');
  let upstreamCalls=0;let mode='ok';
  const context={exports:{},Request,Response,FormData,File,Blob,Uint8Array,AbortSignal,DOMException,console,process:{env:{OPENROUTER_API_KEY:'test-only'}},fetch:async(url,opts)=>{upstreamCalls++;assert.equal(url,'https://openrouter.ai/api/v1/audio/transcriptions');assert.equal(opts.headers.Authorization,'Bearer test-only');assert.equal(opts.body.get('model'),'openai/gpt-transcribe');assert.equal(opts.body.get('response_format'),'json');if(mode==='bad')return new Response('invalid');return Response.json({text:' question '})}};
  vm.runInNewContext(compile('app/api/transcribe/route.ts'),context);const post=context.exports.POST;
  const request=(type='audio/webm',size=5)=>{const f=new FormData();f.set('audio',new Blob([new Uint8Array(size)],{type}),'recording');return new Request('http://localhost/api/transcribe',{method:'POST',body:f})};
  assert.equal((await post(new Request('http://localhost',{method:'POST',body:'x'}))).status,415);
  assert.equal((await post(request('text/plain'))).status,415);
  assert.equal((await post(request('audio/webm',0))).status,400);
  assert.equal((await post(new Request('http://localhost',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=test'},body:new Uint8Array(9*1024*1024)}))).status,413,'no Content-Length oversized upload');
  assert.equal(upstreamCalls,0);let res=await post(request());assert.equal(res.status,200);assert.equal((await res.json()).text,'question');
  mode='bad';assert.equal((await post(request())).status,502);
  context.process.env.OPENROUTER_API_KEY='';assert.equal((await post(request())).status,503);
  console.log('PASS route simulation: MIME, empty audio, hard streamed upload cap without Content-Length, upstream contract, transcript, malformed provider JSON, missing key. No microphone or external API used.');
})().catch(e=>{console.error(e);process.exitCode=1});
