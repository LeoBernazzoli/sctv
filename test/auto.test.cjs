const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const script=fs.readFileSync(path.join(__dirname,'../launcher/auto.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../launcher/index.html'),'utf8');
const ENTRY='http://127.0.0.1:8081/module/gh%2Fleobernazzoli%2Fsctv%40a/launcher/index.html';
async function launch(t,options={}){
 const dom=new JSDOM(html,{url:options.url||ENTRY,runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 t.after(()=>dom.window.close());const w=dom.window,sent=[],requested=[],navigations=[];let socket;
 if(options.cached)w.localStorage.setItem('sctv.auto.last',JSON.stringify(options.cached));
 w.document.addEventListener('click',e=>{if(e.target.id==='launch'){e.preventDefault();navigations.push(e.target.href);}});
 w.XMLHttpRequest=class{
  open(method,url){this.url=url;requested.push(url);}
  send(){w.setTimeout(()=>{if(options.networkError){this.onerror();return;}this.status=options.status||200;this.responseText=JSON.stringify(options.release||{schema:1,version:'0.3.1',tag:'v0.3.1'});this.onload();},0);}
  abort(){}
 };
 w.WebSocket=class{
  constructor(url){if(options.socketError)throw Error('blocked');this.url=url;socket=this;w.setTimeout(()=>this.onopen(),0);}
  send(text){const msg=JSON.parse(text);sent.push(msg);if(msg.type===1&&options.autoAck!==false)w.setTimeout(()=>this.ack(true),0);}
  ack(ready){this.onmessage({data:JSON.stringify({type:1,payload:{tizenDebug:ready,webDebug:ready}})});}
  close(){if(this.onclose)this.onclose();}
 };
 w.eval(script);await new Promise(r=>w.setTimeout(r,30));
 return {w,d:w.document,sent,requested,navigations,socket};
}
test('stable entry launches the latest pinned app through the native TizenBrew bridge',async t=>{
 const {w,sent,requested,navigations}=await launch(t);
 assert.deepEqual(sent.map(x=>x.type),[-1,5,1]);
 assert.equal(sent[1].payload.fullName,'gh/leobernazzoli/sctv@v0.3.1');
 assert.equal(sent[1].payload.mainFile,'src/tv.js');assert.equal(sent[1].payload.packageType,'mods');
 assert.equal(navigations[0],'https://streamingcommunityz.boo/en');
 assert.match(requested[0],/^https:\/\/raw\.githubusercontent\.com\/LeoBernazzoli\/sctv\/main\/update\.json\?check=/);
 assert.equal(w.__scAutoLoader.state,'launched');
 assert.equal(JSON.parse(w.localStorage.getItem('sctv.auto.last')).version,'0.3.1');
 assert.equal(sent.some(x=>x.type===10),false);
});
test('the same stable entry and loader can select a newer version on the next launch',async t=>{
 const first=await launch(t,{release:{schema:1,version:'0.3.1',tag:'v0.3.1'}});
 const second=await launch(t,{release:{schema:1,version:'0.3.2',tag:'v0.3.2'},cached:{schema:1,version:'0.3.1',tag:'v0.3.1'}});
 assert.equal(first.w.location.pathname,second.w.location.pathname);
 assert.equal(second.sent[1].payload.fullName,'gh/leobernazzoli/sctv@v0.3.2');
 assert.notEqual(first.requested[0],second.requested[0]);
});
test('a failed update check starts the last valid version instead of requiring new text input',async t=>{
 const {d,sent}=await launch(t,{networkError:true,cached:{schema:1,version:'0.3.1',tag:'v0.3.1'}});
 assert.equal(sent[1].payload.version,'0.3.1');assert.equal(d.querySelector('#retry').hidden,true);
});
test('the initial bundled fallback is available when the channel is unreachable and no cache exists',async t=>{
 const {sent}=await launch(t,{status:500});assert.equal(sent[1].payload.version,'0.3.0');
});
test('invalid channel versions cannot redirect to arbitrary repositories or code',async t=>{
 const {sent,requested}=await launch(t,{release:{schema:1,version:'0.3.1',tag:'https://evil.example/app.js'}});
 assert.equal(sent[1].payload.fullName,'gh/leobernazzoli/sctv@v0.3.0');assert.equal(requested.length,1);
});
test('navigation waits until TizenBrew acknowledges the module handoff',async t=>{
 const {w,socket,navigations}=await launch(t,{autoAck:false});
 assert.equal(w.__scAutoLoader.state,'connecting');assert.equal(navigations.length,0);
 socket.ack(true);assert.equal(navigations.length,1);assert.equal(w.__scAutoLoader.state,'launched');
});
test('an unavailable debug session shows a retry control without reporting a completed update',async t=>{
 const {w,d,socket,navigations}=await launch(t,{autoAck:false});socket.ack(false);
 assert.equal(w.__scAutoLoader.state,'error');assert.equal(d.querySelector('#retry').hidden,false);
 assert.equal(d.activeElement.id,'retry');assert.equal(navigations.length,0);
});
test('late replies cannot navigate after an update handoff has already failed',async t=>{
 const {w,socket,navigations}=await launch(t,{autoAck:false});socket.ack(false);socket.ack(true);
 assert.equal(w.__scAutoLoader.state,'error');assert.equal(navigations.length,0);
});
test('a blocked local bridge leaves an operable retry screen',async t=>{
 const {d,w}=await launch(t,{socketError:true});assert.equal(w.__scAutoLoader.state,'error');assert.equal(d.querySelector('#retry').hidden,false);
});
test('the stable loader does not run on the content website',async t=>{
 const {w,requested,sent}=await launch(t,{url:'https://streamingcommunityz.boo/en'});
 assert.equal(w.__scAutoLoader,undefined);assert.equal(requested.length,0);assert.equal(sent.length,0);
});
