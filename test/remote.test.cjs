const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../src/tv.js'), 'utf8');
const config = require('../package.json');
const fixture = `<main>
  <button id="search" data-box="100,50,150,50">Cerca</button>
  <a id="play" class="info-button play" href="#watch" data-box="100,150,150,50">Play</a>
  <a id="info" href="#details" data-box="300,150,150,50">More info</a>
  <a id="card" href="#title" data-box="100,350,150,220">Titolo</a>
  <input id="query" data-box="600,150,200,50">
  <button hidden id="hidden" data-box="260,150,20,50">Nascosto</button>
  <button disabled id="disabled" data-box="265,150,20,50">Disabilitato</button>
</main>`;

async function boot(t, html = fixture, url = config.websiteURL) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  t.after(() => w.close());
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    const [left, top, width, height] = (this.getAttribute('data-box') || '0,0,100,40').split(',').map(Number);
    return { left, top, right: left + width, bottom: top + height, width, height };
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.scrollBy = function () {};
  w.eval(source);
  await new Promise(resolve => w.setTimeout(resolve, 0));
  const key = (code, options = {}) => {
    const event = new w.KeyboardEvent('keydown', { keyCode: code, bubbles: true, cancelable: true, ...options });
    w.document.activeElement.dispatchEvent(event);
    return event;
  };
  return { w, d: w.document, key };
}

test('manifest exposes a loadable TizenBrew module and matching URL', () => {
  assert.equal(config.packageType, 'mods');
  assert.equal(config.main, 'src/tv.js');
  assert.ok(source.includes(`var HOME_URL = '${config.websiteURL}'`));
  assert.ok(fs.existsSync(path.join(__dirname, '..', config.main)));
});

test('focuses Play, navigates cards in two dimensions, skips hidden and disabled controls', async t => {
  const { d, key } = await boot(t);
  assert.equal(d.activeElement.id, 'play');
  key(39);
  assert.equal(d.activeElement.id, 'info');
  key(37);
  assert.equal(d.activeElement.id, 'play');
  key(40);
  assert.equal(d.activeElement.id, 'card');
  key(38);
  assert.equal(d.activeElement.id, 'play');
  key(38);
  assert.equal(d.activeElement.id, 'search');
});

test('OK clicks a control once; a held OK does not keep activating it', async t => {
  const { d, key } = await boot(t);
  let clicks = 0;
  d.querySelector('#play').onclick = e => { e.preventDefault(); clicks++; };
  assert.equal(key(13).defaultPrevented, true);
  key(13, { repeat: true });
  assert.equal(clicks, 1);
});

test('help traps navigation and Return restores the previous selection', async t => {
  const { d, key } = await boot(t);
  key(406);
  const panel = d.querySelector('#sc-tv-panel');
  assert.equal(panel.hidden, false);
  assert.ok(panel.contains(d.activeElement));
  key(40);
  assert.ok(panel.contains(d.activeElement));
  key(10009);
  assert.equal(panel.hidden, true);
  assert.equal(d.activeElement.id, 'play');
});

test('native search input keeps arrows and OK; Return releases it', async t => {
  const { d, key } = await boot(t);
  const query = d.querySelector('#query');
  query.focus();
  assert.equal(key(37).defaultPrevented, false);
  assert.equal(key(13).defaultPrevented, false);
  assert.equal(d.activeElement, query);
  assert.equal(key(10009).defaultPrevented, true);
  assert.notEqual(d.activeElement, query);
  key(37);
  assert.equal(d.activeElement.id, 'info');
});

test('reselects a control after the site dynamically removes the focused element', async t => {
  const { w, d, key } = await boot(t);
  d.querySelector('#play').remove();
  await new Promise(resolve => w.setTimeout(resolve, 160));
  assert.equal(d.activeElement.id, 'search');
  const next = d.createElement('button');
  next.id = 'dynamic';
  next.setAttribute('data-box', '300,50,150,50');
  d.querySelector('main').appendChild(next);
  key(39);
  assert.equal(d.activeElement.id, 'dynamic');
});

test('site modal becomes the navigation scope', async t => {
  const { w, d, key } = await boot(t);
  const dialog = d.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = '<button id="confirm">Conferma</button>';
  d.body.appendChild(dialog);
  await new Promise(resolve => w.setTimeout(resolve, 160));
  assert.equal(d.activeElement.id, 'confirm');
  key(39);
  assert.equal(d.activeElement.id, 'confirm');
});

test('media keys play, pause and seek within the video duration', async t => {
  const { d, key } = await boot(t, fixture + '<video data-box="0,600,800,450"></video>');
  const video = d.querySelector('video');
  let paused = true;
  Object.defineProperties(video, {
    paused: { get: () => paused },
    duration: { value: 90 },
    seekable: { value: { length: 0 } }
  });
  video.play = () => { paused = false; return Promise.resolve(); };
  video.pause = () => { paused = true; };
  assert.equal(key(10252).defaultPrevented, true);
  assert.equal(paused, false);
  key(10252);
  assert.equal(paused, true);
  video.currentTime = 85;
  key(417);
  assert.equal(video.currentTime, 90);
  video.currentTime = 3;
  key(412);
  assert.equal(video.currentTime, 0);
});

test('failed playback produces a hint without an unhandled rejection', async t => {
  const { w, d, key } = await boot(t, fixture + '<video></video>');
  d.querySelector('video').play = () => Promise.reject(new Error('gesture required'));
  key(415);
  await new Promise(resolve => w.setTimeout(resolve, 0));
  assert.match(d.querySelector('#sc-tv-badge').textContent, /Premi OK/);
});

test('embedded players retain their own arrow and OK handling', async t => {
  const { d, key } = await boot(t, fixture + '<iframe id="player"></iframe>');
  d.querySelector('#player').focus();
  assert.equal(key(39).defaultPrevented, false);
  assert.equal(key(13).defaultPrevented, false);
});

test('repeated injection does not duplicate UI or event handlers', async t => {
  const { w, d, key } = await boot(t);
  w.eval(source);
  assert.equal(d.querySelectorAll('#sc-tv-panel').length, 1);
  key(457);
  assert.equal(d.querySelector('#sc-tv-panel').hidden, false);
});

test('does not alter unrelated sites', async t => {
  const { w, d, key } = await boot(t, fixture, 'https://example.org/');
  assert.equal(w.__scTV, undefined);
  assert.equal(d.querySelector('#sc-tv-panel'), null);
  assert.equal(key(39).defaultPrevented, false);
});
