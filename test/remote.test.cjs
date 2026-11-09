const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const config = require('../package.json');
const source = fs.readFileSync(path.join(__dirname, '..', config.main), 'utf8');
const alpha = {id:1, slug:'alpha', name:'Alpha', type:'movie', plot:'Un film di prova.', score:'8.1', images:[{type:'cover',filename:'alpha.webp'}]};
const beta = {id:2, slug:'beta', name:'Beta', type:'tv', seasons_count:2, score:'7.9', images:[]};
const home = {component:'Home/Home', props:{locale:'en', cdn_url:'https://cdn.streamingcommunityz.boo', title:alpha,
  sliders:[{name:'trending', titles:[alpha,beta]},{name:'latest',titles:[beta,alpha]}]}};
const details = {component:'Titles/Title',props:{locale:'en', title:{...beta,plot:'Una serie di prova.',seasons:[{id:11,number:1},{id:12,number:2}]},
  loadedSeason:{id:11,number:1,episodes:[{id:1001,number:1,name:'Inizio',duration:45},{id:1002,number:2,name:'Seguito'}]}}};
const secondSeason = {component:'Titles/Title',props:{...details.props,loadedSeason:{id:12,number:2,episodes:[{id:2001,number:1,name:'Il ritorno'}]}}};
const html = page => '<!doctype html><html><head></head><body><div id="app" data-page="' + JSON.stringify(page).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;') + '"></div></body></html>';
const tick = w => new Promise(resolve => w.setTimeout(resolve, 12));

async function boot(t, options = {}) {
  const requests = [];
  const responses = {...options.responses};
  const dom = new JSDOM(html(options.page || home), {url:options.url || config.websiteURL,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
  const w = dom.window;
  const localTimers=[];
  if(options.captureWatchdog){const schedule=w.setTimeout.bind(w);w.setTimeout=(fn,delay,...args)=>{if(delay===25000){localTimers.push(fn);return 99999;}return schedule(fn,delay,...args);};}
  t.after(() => w.close());
  Object.defineProperty(w,'innerWidth',{value:1920,writable:true});
  Object.defineProperty(w,'innerHeight',{value:1080,writable:true});
  w.HTMLElement.prototype.getBoundingClientRect = function () { return {left:100,top:200,right:410,bottom:374,width:310,height:174}; };
  w.XMLHttpRequest = class {
    open(method,url) { this.method=method; this.path=new URL(url).pathname+new URL(url).search; }
    setRequestHeader() {}
    send() {
      requests.push(this.path);
      const response=responses[this.path] || {status:404};
      this.timer=w.setTimeout(() => {
        if(this.aborted)return;
        this.status=response.status || 200;
        this.responseText=response.text || html(response.page || home);
        this.onload();
      },response.delay || 0);
    }
    abort() { this.aborted=true;w.clearTimeout(this.timer);if(this.onabort)this.onabort(); }
  };
  if(options.storage)w.localStorage.setItem('sctv-list',JSON.stringify(options.storage));
  if(options.storageHistory)w.localStorage.setItem('sctv-history',JSON.stringify(options.storageHistory));
  if(options.modern)Object.defineProperty(w.HTMLScriptElement.prototype,'noModule',{value:false,configurable:true});
  w.eval(source);
  await tick(w);
  const d=w.document;
  const key=(code,extra={})=>{const e=new w.KeyboardEvent('keydown',{keyCode:code,bubbles:true,cancelable:true,...extra});d.activeElement.dispatchEvent(e);return e;};
  const select=name=>d.querySelector('[data-key="'+name+'"]').click();
  const focused=()=>d.activeElement.getAttribute('data-key');
  return {w,d,key,select,focused,requests,responses,localTimers};
}

test('manifest ships a standalone compiled TV interface with matching version',()=>{
  assert.equal(config.packageType,'mods');assert.equal(config.main,'src/tv.js');
  assert.ok(source.includes("var HOME_URL = '"+config.websiteURL+"'"));
  assert.ok(source.includes("var VERSION = '"+config.version+"'"));
  assert.ok(!source.includes('/*__SC_TV_CSS__*/'));
});
test('renders large TV shell and real catalogue titles with initial hero focus',async t=>{
  const {d,w,focused}=await boot(t);
  assert.ok(d.documentElement.classList.contains('sc-tv-active'));
  assert.equal(d.querySelector('h1').textContent,'Alpha');
  assert.equal(d.querySelectorAll('.sc-card').length,4);
  assert.equal(d.querySelector('.sc-card img').src,'https://cdn.streamingcommunityz.boo/images/alpha.webp');
  assert.equal(focused(),'hero-play');assert.equal(w.__scTV.mode,'catalogue');
});
test('D-pad navigates predictable rows and preserves columns between shelves',async t=>{
  const {key,focused}=await boot(t);
  key(40);assert.equal(focused(),'s0-0');
  key(39);assert.equal(focused(),'s0-1');
  key(40);assert.equal(focused(),'s1-1');
  key(37);assert.equal(focused(),'s1-0');
  key(38);assert.equal(focused(),'s0-0');
});
test('film and series navigation filter the catalogue',async t=>{
  const {d,select}=await boot(t);
  select('nav-tv');assert.ok([...d.querySelectorAll('.sc-card-title')].every(el=>el.textContent==='Beta'));
  select('nav-movie');assert.ok([...d.querySelectorAll('.sc-card-title')].every(el=>el.textContent==='Alpha'));
});
test('selecting a card loads details and Return restores the card selection',async t=>{
  const {d,w,key,focused,responses}=await boot(t);
  responses['/en/titles/2-beta']={page:details};
  key(40);key(39);key(13);await tick(w);
  assert.equal(d.querySelector('h1').textContent,'Beta');
  assert.equal(d.querySelectorAll('.sc-episode').length,2);
  key(10009);assert.equal(focused(),'s0-1');
});
test('held OK does not launch repeated detail requests',async t=>{
  const {d,w,key,requests,responses}=await boot(t);
  responses['/en/titles/2-beta']={page:details};
  d.querySelector('[data-key="s0-1"]').focus();
  key(13,{repeat:true});await tick(w);assert.equal(requests.length,0);
});
test('native search keyboard keeps arrows and Return moves to submit',async t=>{
  const {d,select,key,focused}=await boot(t);
  select('nav-search');assert.equal(d.activeElement.tagName,'INPUT');
  assert.equal(key(37).defaultPrevented,false);
  assert.equal(key(13).defaultPrevented,false);
  key(10009);assert.equal(focused(),'search-submit');
});
test('search encodes the query and displays structured results',async t=>{
  const {d,w,select,responses,requests,focused}=await boot(t);
  responses['/en/search?q=hello%20world']={page:{component:'Titles/Browse',props:{titles:[beta]}}};
  select('nav-search');d.querySelector('input').value=' hello world ';
  d.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick(w);
  assert.equal(requests[0],'/en/search?q=hello%20world');
  assert.equal(d.querySelector('.sc-card-title').textContent,'Beta');assert.equal(focused(),'result-0');
});
test('empty search results remain usable',async t=>{
  const {d,w,select,responses,focused}=await boot(t);
  responses['/en/search?q=none']={page:{component:'Titles/Browse',props:{titles:[]}}};
  select('nav-search');d.querySelector('input').value='none';
  d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick(w);
  assert.match(d.querySelector('.sc-empty').textContent,/Nessun risultato/);assert.equal(focused(),'search-submit');
});
test('favourites persist and appear in the personal list',async t=>{
  const {d,w,select}=await boot(t,{page:details});
  select('detail-list');assert.equal(JSON.parse(w.localStorage.getItem('sctv-list'))[0].id,2);
  select('nav-list');assert.equal(d.querySelector('.sc-card-title').textContent,'Beta');
});
test('invalid stored favourites do not crash the application',async t=>{
  const {d,select}=await boot(t,{storage:{bad:true}});
  select('nav-list');assert.match(d.querySelector('.sc-empty').textContent,/salvarlo/);
});
test('season selection loads episodes without rebuilding the desktop website',async t=>{
  const {d,w,select,requests}=await boot(t,{page:details,responses:{'/en/titles/2-beta/season-2':{page:secondSeason}}});
  select('season-1');await tick(w);
  assert.equal(requests[0],'/en/titles/2-beta/season-2');assert.match(d.querySelector('.sc-episode').textContent,/Il ritorno/);
});
test('episode links use the existing player route and save return focus',async t=>{
  const {d,w}=await boot(t,{page:details});
  const episode=d.querySelector('[data-key="episode-1"]');
  assert.equal(episode.href,'https://streamingcommunityz.boo/en/watch/2?e=1002');
  episode.addEventListener('click',e=>e.preventDefault());episode.focus();episode.click();
  const saved=JSON.parse(w.sessionStorage.getItem('sctv-return'));
  assert.equal(saved.focus,'episode-1');assert.equal(saved.kind,'detail');
});
test('HTTP failures show a useful message and preserve the existing catalogue',async t=>{
  const {d,w,select}=await boot(t,{responses:{'/en/titles/2-beta':{status:403}}});
  select('s0-1');await tick(w);
  assert.equal(d.querySelector('h1').textContent,'Alpha');assert.match(d.querySelector('.sc-status').textContent,/403/);
  assert.equal(d.querySelector('.sc-loading').hidden,true);
});
test('cancelled requests do not replace the current screen later',async t=>{
  const {d,w,select,key}=await boot(t,{responses:{'/en/titles/2-beta':{page:details,delay:40}}});
  select('s0-1');key(10009);await new Promise(resolve=>w.setTimeout(resolve,70));
  assert.equal(d.querySelector('h1').textContent,'Alpha');assert.equal(d.querySelector('.sc-loading').hidden,true);
});
test('help traps focus and closes with Return',async t=>{
  const {d,key,focused}=await boot(t);
  key(406);assert.ok(d.querySelector('[role="dialog"]'));assert.equal(focused(),'help-close');
  key(39);assert.equal(focused(),'help-original');key(40);assert.equal(focused(),'help-original');
  key(10009);assert.equal(d.querySelector('[role="dialog"]'),null);assert.equal(focused(),'hero-play');
});
test('remote catalogue strings cannot inject HTML',async t=>{
  const malicious={...home,props:{...home.props,title:{...alpha,name:'<img src=x onerror=alert(1)>'}}};
  const {d}=await boot(t,{page:malicious});
  assert.equal(d.querySelector('h1 img'),null);assert.match(d.querySelector('h1').textContent,/<img/);
});
test('player pages keep native navigation and do not get the catalogue overlay',async t=>{
  const {w,d,key}=await boot(t,{url:'https://streamingcommunityz.boo/en/watch/2'});
  assert.equal(w.__scTV.mode,'player');assert.equal(d.querySelector('#sc-tv-root'),null);assert.equal(key(39).defaultPrevented,false);
});
test('repeated injection and unrelated sites are left alone',async t=>{
  const {w,d}=await boot(t);w.eval(source);assert.equal(d.querySelectorAll('#sc-tv-root').length,1);
  const other=await boot(t,{url:'https://example.org/'});assert.equal(other.w.__scTV,undefined);
});
test('resizes proportionally for 720p television viewports',async t=>{
  const {w,d}=await boot(t);w.innerWidth=1280;w.innerHeight=720;w.dispatchEvent(new w.Event('resize'));
  assert.match(d.querySelector('#sc-tv-root').style.transform,/scale\(0\.666/);
});

test('Tizen 3 fallback mounts the server-provided same-origin player iframe',async t=>{
  const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2?e=1002',redirectToLogin:false}};
  const {w,d}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2?e=1002'});
  const frame=d.querySelector('#sc-tv-player iframe');
  assert.ok(frame);assert.equal(frame.src,page.props.embedUrl);assert.ok(frame.hasAttribute('allowfullscreen'));
  assert.equal(w.__scTV.player.iframeMounted,true);assert.equal(w.__scTV.player.verifiedPlayback,false);
});
test('modern browsers keep the original watch application',async t=>{
  const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2'}};
  const {w,d}=await boot(t,{page,modern:true,url:'https://streamingcommunityz.boo/en/watch/2'});
  assert.equal(d.querySelector('#sc-tv-player'),null);assert.equal(w.__scTV.player.legacyBootstrap,false);
});
test('legacy player fallback preserves login requirements',async t=>{
  const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2',redirectToLogin:true}};
  const {w,d}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2'});
  assert.equal(d.querySelector('#sc-tv-player'),null);assert.equal(w.__scTV.player.reason,'site-requires-login');
});
test('legacy player fallback rejects unrelated embed addresses',async t=>{
  const page={component:'Titles/Watch',props:{embedUrl:'https://example.org/en/iframe/2'}};
  const {w,d}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2'});
  assert.equal(d.querySelector('#sc-tv-player'),null);assert.equal(w.__scTV.player.reason,'unexpected-embed-address');
});

test('player diagnostics show missing observations without claiming a codec failure',async t=>{
  const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2'}};
  const {d,key}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2'});
  key(457);const panel=d.querySelector('#sc-tv-player-diagnostics');
  assert.equal(panel.hidden,false);assert.match(panel.textContent,/Nessun dato ricevuto/);
  key(10009);assert.equal(panel.hidden,true);
});
test('player diagnostics accept only the actual embedded window and its expected origin',async t=>{
  const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2'}};
  const {w,d,key}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2'});
  const frame=d.querySelector('#sc-tv-player iframe');
  const inner=frame.contentWindow.document;inner.open();inner.write('<iframe src="https://vixcloud.cc/embed/2"></iframe>');inner.close();
  const sourceWindow=inner.querySelector('iframe').contentWindow;
  const data={type:'sctv-player-state',stage:'media-error',error:3,readyState:1,networkState:2,scriptErrors:0,moduleScripts:1,modulesSupported:false};
  w.dispatchEvent(new w.MessageEvent('message',{origin:'https://example.org',source:sourceWindow,data}));
  assert.equal(w.__scTV.player.lastState,undefined);
  w.dispatchEvent(new w.MessageEvent('message',{origin:'https://vixcloud.cc',source:w,data}));
  assert.equal(w.__scTV.player.lastState,undefined);
  w.dispatchEvent(new w.MessageEvent('message',{origin:'https://vixcloud.cc',source:sourceWindow,data}));
  assert.equal(w.__scTV.player.lastState.error,3);
  key(457);assert.match(d.querySelector('#sc-tv-player-diagnostics').textContent,/Errore di decodifica/);
  assert.equal(w.__scTV.player.verifiedPlayback,false);
});
function embeddedEnvironment(t,parentURL=config.websiteURL,options={}){
  const dom=new JSDOM('<iframe src="https://vixcloud.cc/embed/2?token=secret-token"></iframe>',{url:parentURL,runScripts:'outside-only',virtualConsole:new VirtualConsole()});
  t.after(()=>dom.window.close());const reports=[];dom.window.postMessage=(data,target)=>reports.push({data,target});
  const child=dom.window.document.querySelector('iframe').contentWindow;
  child.document.open();child.document.write(options.noVideo?'<body></body>':'<body><video></video></body>');child.document.close();
  const video=child.document.querySelector('video');let paused=true;
  if(video){Object.defineProperty(video,'paused',{get:()=>paused});
  video.play=()=>{paused=false;return Promise.resolve();};video.pause=()=>{paused=true;};}
  if(options.master)child.masterPlaylist=options.master;
  if(options.streams)child.streams=options.streams;
  if(options.prefs)child.localStorage.setItem('sctv-player',JSON.stringify(options.prefs));
  if(options.Hls)child.Hls=options.Hls;
  if(options.jwplayer)child.jwplayer=()=>({});
  child.eval(source);
  if(child.document.readyState==='loading')child.document.dispatchEvent(new child.Event('DOMContentLoaded'));
  return {child,video,reports};
}
test('embedded player media controls operate on the video without sending source URLs',t=>{
  const {child,video,reports}=embeddedEnvironment(t);
  child.document.body.dispatchEvent(new child.KeyboardEvent('keydown',{keyCode:13,bubbles:true,cancelable:true}));
  assert.equal(video.paused,false);
  child.document.body.dispatchEvent(new child.KeyboardEvent('keydown',{keyCode:19,bubbles:true,cancelable:true}));
  assert.equal(video.paused,true);
  assert.ok(reports.length);assert.ok(reports.every(r=>r.target==='https://streamingcommunityz.boo'));
  assert.equal(JSON.stringify(reports).includes('secret-token'),false);
  assert.equal(JSON.stringify(reports).includes('currentSrc'),false);
});
test('embedded Info key requests diagnostics from the parent',t=>{
  const {child,reports}=embeddedEnvironment(t);
  child.document.body.dispatchEvent(new child.KeyboardEvent('keydown',{keyCode:457,bubbles:true,cancelable:true}));
  assert.ok(reports.some(r=>r.data.type==='sctv-player-action'&&r.data.action==='diagnostics'));
});
test('embedded helper does not activate for a player opened from an unrelated site',t=>{
  const {child,reports}=embeddedEnvironment(t,'https://example.org/');
  assert.equal(child.__scTVFrame,undefined);assert.equal(reports.length,0);
});

test('player has no Catalogo or Info buttons and Back leaves it',async t=>{
 const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2'}};
 const {w,d,key}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2'});
 assert.equal(d.querySelector('#sc-tv-player-back'),null);assert.equal(d.querySelector('#sc-tv-player-info'),null);
 assert.equal(d.querySelector('#sc-tv-player-status'),null);
 key(457);assert.equal(d.querySelector('#sc-tv-player-diagnostics').hidden,false);
 key(10009);assert.equal(d.querySelector('#sc-tv-player-diagnostics').hidden,true);assert.equal(w.__scTV.player.leaving,undefined);
 key(10009);assert.equal(w.__scTV.player.leaving,true);
});
test('missing video opens diagnostics automatically after eight seconds of reported blockage',async t=>{
 const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2'}};
 const {w,d,key}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2'});
 const inner=d.querySelector('#sc-tv-player iframe').contentWindow.document;inner.open();inner.write('<iframe src="https://vixcloud.cc/embed/2"></iframe>');inner.close();
 const sourceWindow=inner.querySelector('iframe').contentWindow;let now=1000;w.Date.now=()=>now;
 const data={type:'sctv-player-state',stage:'no-video',scriptErrorKind:'ReferenceError',missingFeature:'URLSearchParams',scriptErrors:1};
 const report=()=>w.dispatchEvent(new w.MessageEvent('message',{origin:'https://vixcloud.cc',source:sourceWindow,data}));
 report();assert.equal(d.querySelector('#sc-tv-player-diagnostics').hidden,true);
 now=10000;report();const panel=d.querySelector('#sc-tv-player-diagnostics');
 assert.equal(panel.hidden,false);assert.match(panel.textContent,/ReferenceError.*URLSearchParams/);
 key(10009);now=14000;report();assert.equal(panel.hidden,true);
});
test('embedded helper forwards remote navigation when the external player has no video',t=>{
 const {child,reports}=embeddedEnvironment(t,config.websiteURL,{noVideo:true});
 const event=new child.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true});
 child.document.body.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
 assert.ok(reports.some(r=>r.data.action==='navigate'&&r.data.key===39));
});
test('script diagnostics recognise missing APIs without disclosing error URLs or tokens',t=>{
 const {child,reports}=embeddedEnvironment(t,config.websiteURL,{noVideo:true});
 child.dispatchEvent(new child.ErrorEvent('error',{message:'URLSearchParams is not defined at https://private.example/?token=secret-token',error:new child.ReferenceError('URLSearchParams is not defined')}));
 const data=reports[reports.length-1].data;assert.equal(data.scriptErrorKind,'ReferenceError');assert.equal(data.missingFeature,'URLSearchParams');
 assert.equal(JSON.stringify(reports).includes('private.example'),false);assert.equal(JSON.stringify(reports).includes('secret-token'),false);
});
test('Return exits fullscreen before leaving the player',t=>{
 const {child,reports,video}=embeddedEnvironment(t);let exited=false;
 Object.defineProperty(child.document,'fullscreenElement',{value:video});
 child.document.exitFullscreen=()=>{exited=true;return Promise.resolve();};
 child.document.body.dispatchEvent(new child.KeyboardEvent('keydown',{keyCode:10009,bubbles:true,cancelable:true}));
 assert.equal(exited,true);assert.equal(reports.some(r=>r.data.action==='navigate'),false);
});

test('player recovery opens without receiving any messages from the external player',async t=>{
 const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2'}};
 const {w,d,localTimers}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2',captureWatchdog:true});
 assert.equal(localTimers.length,1);assert.equal(d.querySelector('#sc-tv-player-diagnostics').hidden,true);
 localTimers[0]();const panel=d.querySelector('#sc-tv-player-diagnostics');
 assert.equal(panel.hidden,false);assert.match(panel.textContent,/Apertura di emergenza/);assert.match(panel.textContent,/Nessun dato ricevuto/);
 assert.equal(w.__scTV.player.diagnosticsReason,'local-timeout');
 assert.match(panel.textContent,new RegExp('SC TV '+config.version.replace(/\./g,'\\.')));
});
test('player recovery stays closed when playback is reported',async t=>{
 const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2'}};
 const {w,d,localTimers}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2',captureWatchdog:true});
 const inner=d.querySelector('#sc-tv-player iframe').contentWindow.document;inner.open();inner.write('<iframe src="https://vixcloud.cc/embed/2"></iframe>');inner.close();
 w.dispatchEvent(new w.MessageEvent('message',{origin:'https://vixcloud.cc',source:inner.querySelector('iframe').contentWindow,data:{type:'sctv-player-state',stage:'playing',readyState:4}}));
 localTimers[0]();assert.equal(d.querySelector('#sc-tv-player-diagnostics').hidden,true);
});
test('closing diagnostics manually suppresses the local recovery reopening',async t=>{
 const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2'}};
 const {d,key,localTimers}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2',captureWatchdog:true});
 key(457);key(10009);localTimers[0]();assert.equal(d.querySelector('#sc-tv-player-diagnostics').hidden,true);
});

const master={url:'https://vixcloud.cc/playlist/2',params:{token:'secret-token',expires:'1794234852',asn:''}};
test('Tizen 3 player: native video plays the site playlist when JW Player cannot start',t=>{
 const {child,reports}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,prefs:{engine:'native'}});
 const video=child.document.getElementById('sc-tv-native');assert.ok(video);
 const src=new URL(video.getAttribute('src'));
 assert.equal(src.origin+src.pathname,'https://vixcloud.cc/playlist/2');
 assert.equal(src.searchParams.get('token'),'secret-token');assert.equal(src.searchParams.get('expires'),'1794234852');
 assert.equal(src.searchParams.has('asn'),false);assert.equal(src.searchParams.get('lang'),'en');
 assert.equal(child.__scTVFrame.engine,'native-hls');
 assert.ok(reports.some(r=>r.data.engine==='native-hls'));
 assert.equal(JSON.stringify(reports).includes('secret-token'),false);
 assert.equal(JSON.stringify(reports).includes('playlist'),false);
});
test('Tizen 3 player: remote arrows seek and OK toggles the native video',t=>{
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,prefs:{engine:'native'}});
 const video=child.document.getElementById('sc-tv-native');let paused=true;
 Object.defineProperty(video,'paused',{get:()=>paused});video.play=()=>{paused=false;return Promise.resolve();};video.pause=()=>{paused=true;};
 let time=100;Object.defineProperty(video,'currentTime',{get:()=>time,set:v=>{time=v;}});
 Object.defineProperty(video,'duration',{value:1000});
 Object.defineProperty(video,'seekable',{value:{length:1,start:()=>0,end:()=>1000}});
 const press=code=>{const e=new child.KeyboardEvent('keydown',{keyCode:code,bubbles:true,cancelable:true});child.document.body.dispatchEvent(e);return e;};
 press(13);assert.equal(paused,false);
 assert.equal(press(39).defaultPrevented,true);assert.equal(time,110);
 press(37);press(37);assert.equal(time,90);
 press(13);assert.equal(paused,true);
});
test('Tizen 3 player: modern browsers keep the site JW Player',t=>{
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,jwplayer:true});
 assert.equal(child.document.getElementById('sc-tv-native'),null);assert.equal(child.__scTVFrame.engine,'site');
});
test('Tizen 3 player: unexpected playlist addresses are not loaded',t=>{
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master:{url:'https://example.org/playlist/2',params:{}}});
 assert.equal(child.document.getElementById('sc-tv-native'),null);
});
test('parent diagnostics name the native TV player',async t=>{
 const page={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2'}};
 const {w,d,key}=await boot(t,{page,url:'https://streamingcommunityz.boo/en/watch/2'});
 const inner=d.querySelector('#sc-tv-player iframe').contentWindow.document;inner.open();inner.write('<iframe src="https://vixcloud.cc/embed/2"></iframe>');inner.close();
 w.dispatchEvent(new w.MessageEvent('message',{origin:'https://vixcloud.cc',source:inner.querySelector('iframe').contentWindow,data:{type:'sctv-player-state',stage:'loading',engine:'native-hls'}}));
 key(457);assert.match(d.querySelector('#sc-tv-player-diagnostics').textContent,/video nativo della TV/);
});

test('embedded helper detaches the anti-debugger loop before it can pause the TV browser',async t=>{
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true});
 const d=child.document;
 const trap=d.createElement('script');trap.textContent='function check(){debugger;}check();';
 const normal=d.createElement('script');normal.textContent='window.ok=1;';
 d.body.appendChild(trap);d.body.appendChild(normal);
 await new Promise(r=>child.setTimeout(r,0));
 assert.equal(trap.parentNode,null);assert.equal(trap.type,'javascript/blocked');
 assert.equal(normal.parentNode,d.body);assert.equal(child.__scTVFrame.disarmed,1);
});

function fakeHls(){
 const created=[];
 class Hls{
  static isSupported(){return true;}
  constructor(config){this.config=config;this.handlers={};this.levels=[];this.audioTracks=[];this.subtitleTracks=[];
   this.currentLevel=-1;this.audioTrack=0;this.subtitleTrack=-1;this.subtitleDisplay=true;this.destroyed=false;created.push(this);}
  on(name,fn){(this.handlers[name]=this.handlers[name]||[]).push(fn);}
  emit(name,data){(this.handlers[name]||[]).forEach(fn=>fn(name,data));}
  loadSource(url){this.url=url;} attachMedia(v){this.media=v;} destroy(){this.destroyed=true;}
  startLoad(){this.restarted=true;} recoverMediaError(){this.recovered=true;}
 }
 Hls.Events={MANIFEST_PARSED:'m',AUDIO_TRACKS_UPDATED:'a',SUBTITLE_TRACKS_UPDATED:'s',LEVEL_SWITCHED:'l',ERROR:'e'};
 Hls.ErrorTypes={NETWORK_ERROR:'net',MEDIA_ERROR:'media',OTHER_ERROR:'other'};
 return {Hls,created};
}
function loadedHls(hls){
 hls.levels=[{height:480},{height:720},{height:1080}];hls.emit('m',{});
 hls.audioTracks=[{name:'Italian',lang:'ita'},{name:'English',lang:'eng'}];hls.audioTrack=1;hls.emit('a',{});
 hls.subtitleTracks=[{name:'Italian [Forced]',lang:'ita-forced'},{name:'Italian',lang:'ita'}];hls.subtitleTrack=0;hls.emit('s',{});
}
const pressIn=(child,code)=>{const e=new child.KeyboardEvent('keydown',{keyCode:code,bubbles:true,cancelable:true});child.document.body.dispatchEvent(e);return e;};
test('settings: hls.js player picks the best quality offered and lists quality, audio and subtitles',t=>{
 const {Hls,created}=fakeHls();
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,Hls});
 assert.equal(created.length,1);const hls=created[0];
 assert.match(hls.url,/^https:\/\/vixcloud\.cc\/playlist\/2\?token=secret-token/);
 loadedHls(hls);assert.equal(hls.currentLevel,2);
 const panel=child.document.getElementById('sc-tv-settings');assert.equal(panel.hidden,true);
 assert.equal(pressIn(child,40).defaultPrevented,true);assert.equal(panel.hidden,false);
 const rows=[...panel.querySelectorAll('.sc-tv-setting')].map(r=>r.textContent);
 assert.deepEqual(rows.map(r=>r.replace(/‹.*/,'')),['Qualità','Audio','Sottotitoli','Velocità','Lettore']);
 assert.match(rows[0],/1080p/);assert.match(rows[1],/English/);assert.match(rows[2],/Italian \[Forced\]/);
});
test('settings: remote changes quality, audio, subtitles and speed and remembers them',t=>{
 const {Hls,created}=fakeHls();
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,Hls});
 const hls=created[0];loadedHls(hls);const video=child.document.getElementById('sc-tv-native');
 pressIn(child,457);
 pressIn(child,37);assert.equal(hls.currentLevel,-1);
 pressIn(child,40);pressIn(child,39);assert.equal(hls.audioTrack,0);
 pressIn(child,40);pressIn(child,37);assert.equal(hls.subtitleTrack,-1);
 pressIn(child,40);pressIn(child,39);assert.equal(video.playbackRate,1.25);
 const prefs=JSON.parse(child.localStorage.getItem('sctv-player'));
 assert.deepEqual({q:prefs.quality,a:prefs.audio,s:prefs.subs,v:prefs.speed},{q:'auto',a:'ita',s:'off',v:1.25});
 pressIn(child,10009);assert.equal(child.document.getElementById('sc-tv-settings').hidden,true);
});
test('settings: saved preferences are applied to the next title',t=>{
 const {Hls,created}=fakeHls();
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,Hls,prefs:{quality:480,audio:'ita',subs:'ita|Italian'}});
 const hls=created[0];loadedHls(hls);
 assert.equal(hls.currentLevel,0);assert.equal(hls.audioTrack,0);assert.equal(hls.subtitleTrack,1);
});
test('settings: Back with the menu closed still leaves the player',t=>{
 const {Hls}=fakeHls();
 const {child,reports}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,Hls});
 pressIn(child,10009);assert.ok(reports.some(r=>r.data.action==='navigate'&&r.data.key===10009));
});
test('settings: server switch keeps the stream parameters',t=>{
 const {Hls,created}=fakeHls();
 const streams=[{name:'Server1',active:true,url:'https://vixcloud.cc/playlist/2?ub=1'},{name:'Server2',active:false,url:'https://vixcloud.cc/playlist/2?ab=1'},{name:'Evil',url:'https://example.org/x'}];
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,Hls,streams});
 assert.match(created[0].url,/\?ub=1&token=secret-token/);loadedHls(created[0]);
 pressIn(child,40);const rows=[...child.document.querySelectorAll('.sc-tv-setting')].map(r=>r.textContent.replace(/‹.*/,''));
 const server=rows.indexOf('Server');assert.ok(server>0);
 for(let i=0;i<server;i++)pressIn(child,40);
 pressIn(child,39);assert.equal(created.length,2);assert.equal(created[0].destroyed,true);
 assert.match(created[1].url,/\?ab=1&token=secret-token/);
});
test('settings: fatal hls.js errors fall back to the TV built-in player',t=>{
 const {Hls,created}=fakeHls();
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,Hls});
 const hls=created[0];
 hls.emit('e',{fatal:true,type:'media'});assert.equal(hls.recovered,true);
 hls.emit('e',{fatal:true,type:'media'});assert.equal(hls.destroyed,true);
 const video=child.document.getElementById('sc-tv-native');
 assert.match(video.getAttribute('src'),/^https:\/\/vixcloud\.cc\/playlist\/2\?/);
 assert.equal(child.__scTVFrame.player.engine,'native');
});
test('settings: hls.js is loaded pinned with subresource integrity',t=>{
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master});
 const script=[...child.document.scripts].find(s=>/hls\.js@/.test(s.src));
 assert.ok(script);assert.equal(script.src,'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js');
 assert.match(script.integrity,/^sha384-/);assert.equal(script.crossOrigin,'anonymous');
});

test('settings: a saved 1080p choice falls back to 720p when the title only offers 720p',t=>{
 const {Hls,created}=fakeHls();
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,Hls,prefs:{quality:1080}});
 const hls=created[0];hls.levels=[{height:480},{height:720}];hls.emit('m',{});assert.equal(hls.currentLevel,1);
});
test('player frame resumes only from the watch page that embeds it',t=>{
 const {Hls,created}=fakeHls();
 const {child}=embeddedEnvironment(t,config.websiteURL,{noVideo:true,master,Hls});
 const video=child.document.getElementById('sc-tv-native');let time=0;
 Object.defineProperty(video,'currentTime',{get:()=>time,set:v=>{time=v;}});Object.defineProperty(video,'readyState',{value:1});
 child.dispatchEvent(new child.MessageEvent('message',{origin:'https://example.org',source:child.top,data:{type:'sctv-resume',position:600}}));
 assert.equal(time,0);
 child.dispatchEvent(new child.MessageEvent('message',{origin:'https://streamingcommunityz.boo',source:child.top,data:{type:'sctv-resume',position:600}}));
 assert.equal(time,600);
});
const seriesWatch={component:'Titles/Watch',props:{embedUrl:'https://streamingcommunityz.boo/en/iframe/2?episode_id=1001',
 title:{id:2,slug:'beta',name:'Beta',type:'tv'},episode:{id:1001,number:1,name:'Inizio'},nextEpisode:{id:1002,number:2,name:'Seguito'}}};
async function watching(t,options={}){
 const env=await boot(t,{page:options.page||seriesWatch,url:'https://streamingcommunityz.boo/en/watch/2',storageHistory:options.history});
 const inner=env.d.querySelector('#sc-tv-player iframe').contentWindow.document;inner.open();inner.write('<iframe src="https://vixcloud.cc/embed/2"></iframe>');inner.close();
 const source=inner.querySelector('iframe').contentWindow;const sent=[];source.postMessage=(data,target)=>sent.push({data,target});
 const report=data=>env.w.dispatchEvent(new env.w.MessageEvent('message',{origin:'https://vixcloud.cc',source,data:{type:'sctv-player-state',stage:'playing',readyState:4,...data}}));
 return {...env,report,sent};
}
test('history: watching an episode saves its position on this TV',async t=>{
 const {w,report}=await watching(t);
 report({position:125,duration:2700});report({position:127,duration:2700});report({position:131,duration:2700});
 const h=JSON.parse(w.localStorage.getItem('sctv-history'));
 assert.equal(h.titles[0].id,2);assert.equal(h.titles[0].episode.id,1001);assert.equal(h.titles[0].next.id,1002);
 assert.equal(h.episodes['1001'].p,131);assert.equal(h.episodes['1001'].done,false);
});
test('history: reopening an episode asks the player to resume where it stopped',async t=>{
 const history={titles:[{id:2,slug:'beta',name:'Beta',type:'tv',episode:{id:1001,number:1}}],episodes:{'1001':{p:845,d:2700,u:1,done:false}}};
 const {report,sent}=await watching(t,{history});
 report({position:0,duration:0});
 assert.deepEqual(JSON.parse(JSON.stringify(sent)),[{data:{type:'sctv-resume',position:845},target:'https://vixcloud.cc'}]);
 report({position:3,duration:2700});assert.equal(sent.length,1);
});
test('history: finished episodes are not resumed and point to the next one',async t=>{
 const {w,report,sent}=await watching(t,{history:{titles:[],episodes:{'1001':{p:2650,d:2700,u:1,done:true}}}});
 report({position:0});assert.equal(sent.length,0);
 report({position:2660,duration:2700});
 const h=JSON.parse(w.localStorage.getItem('sctv-history'));assert.equal(h.episodes['1001'].done,true);
});
test('history: home shows Continua a guardare with progress and opens the episode directly',async t=>{
 const history={titles:[{id:2,slug:'beta',name:'Beta',type:'tv',episode:{id:1001,number:1,season:1}},{id:1,slug:'alpha',name:'Alpha',type:'movie',p:1800,d:5400}],
  episodes:{'1001':{p:900,d:2700,u:2,done:false}}};
 const {d,focused,key}=await boot(t,{storageHistory:history});
 const row=[...d.querySelectorAll('.sc-row h2')].map(h=>h.textContent);assert.equal(row[0],'Continua a guardare');
 const cards=[...d.querySelectorAll('[data-card^="continue-"]')];assert.equal(cards.length,2);
 assert.match(cards[0].textContent,/S1 · Episodio 1 · 30 min rimasti/);assert.match(cards[1].textContent,/60 min rimasti/);
 assert.equal(cards[0].querySelector('.sc-progress i').style.width,'33%');
 key(40);assert.equal(focused(),'continue-0');
});
test('history: a finished series episode offers the next one in Continua a guardare',async t=>{
 const history={titles:[{id:2,slug:'beta',name:'Beta',type:'tv',episode:{id:1001,number:1,season:1},next:{id:1002,number:2,season:1}}],
  episodes:{'1001':{p:2690,d:2700,u:2,done:true}}};
 const {d}=await boot(t,{storageHistory:history});
 assert.match(d.querySelector('[data-card="continue-0"]').textContent,/Prossimo: S1 · Episodio 2/);
});
test('history: title page offers Riprendi and marks watched episodes',async t=>{
 const history={titles:[{id:2,slug:'beta',name:'Beta',type:'tv',episode:{id:1002,number:2,season:1}}],
  episodes:{'1001':{p:2690,d:2700,u:1,done:true},'1002':{p:600,d:2700,u:2,done:false}}};
 const {d}=await boot(t,{page:details,url:'https://streamingcommunityz.boo/en/titles/2-beta',storageHistory:history});
 assert.match(d.querySelector('[data-hero="play"]').textContent,/Riprendi S1 · Episodio 2/);
 assert.match(d.querySelector('[data-hero="play"]').getAttribute('href'),/\?e=1002$/);
 const eps=[...d.querySelectorAll('.sc-episode')];assert.match(eps[0].textContent,/✓ Visto/);assert.match(eps[1].textContent,/35 min rimasti/);
});
test('history: starting an episode from the title page remembers its season',async t=>{
 const {w,d}=await boot(t,{page:details,url:'https://streamingcommunityz.boo/en/titles/2-beta'});
 const episode=d.querySelector('[data-key="episode-1"]');episode.addEventListener('click',e=>e.preventDefault());episode.click();
 const h=JSON.parse(w.localStorage.getItem('sctv-history'));assert.equal(h.titles[0].episode.id,1002);assert.equal(h.titles[0].episode.season,1);
});
