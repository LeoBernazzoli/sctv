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
  w.eval(source);
  await tick(w);
  const d=w.document;
  const key=(code,extra={})=>{const e=new w.KeyboardEvent('keydown',{keyCode:code,bubbles:true,cancelable:true,...extra});d.activeElement.dispatchEvent(e);return e;};
  const select=name=>d.querySelector('[data-key="'+name+'"]').click();
  const focused=()=>d.activeElement.getAttribute('data-key');
  return {w,d,key,select,focused,requests,responses};
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
