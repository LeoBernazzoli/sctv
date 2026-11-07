/* SC TV — a television catalogue on the site's own origin. */
(function () {
  'use strict';
  var HOME_URL = 'https://streamingcommunityz.boo/en';
  var VERSION = '0.2.1';
  var CSS = "html.sc-tv-active,html.sc-tv-active body{margin:0!important;padding:0!important;overflow:hidden!important;background:#090b10!important;opacity:1!important;transform:none!important}\nhtml.sc-tv-active body>#app{display:none!important}\n#sc-tv-root,#sc-tv-root *{box-sizing:border-box}\n#sc-tv-root{position:fixed;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0;z-index:2147483645;background:#090b10;color:#f7f7f8;font:30px/1.4 Arial,Helvetica,sans-serif;text-align:left;letter-spacing:0;overflow:hidden;isolation:isolate}\n#sc-tv-root button,#sc-tv-root input,#sc-tv-root a{font:inherit;border:0;letter-spacing:0}\n#sc-tv-root a{color:inherit;text-decoration:none;outline:none}\n#sc-tv-root button{cursor:pointer;color:inherit;outline:none;text-align:left}\n#sc-tv-root [hidden]{display:none!important}\n#sc-tv-root .sc-top{height:108px;padding:0 86px;display:flex;align-items:center;position:absolute;top:0;left:0;right:0;z-index:6;background:linear-gradient(#090b10 30%,rgba(9,11,16,.94) 85%,rgba(9,11,16,0))}\n#sc-tv-root .sc-logo{font-weight:900;font-size:44px;letter-spacing:-3px;color:#ff3348;margin-right:56px;white-space:nowrap}\n#sc-tv-root .sc-logo span{font-size:23px;color:#f4f4f5;letter-spacing:2px;margin-left:8px;vertical-align:middle}\n#sc-tv-root .sc-nav{display:flex;align-items:center;width:100%}\n#sc-tv-root .sc-nav button,#sc-tv-root .sc-nav a{padding:13px 18px;border-radius:9px;background:transparent;color:#aeb1bc;font-size:29px;white-space:nowrap}\n#sc-tv-root .sc-nav button.sc-selected{color:#fff;font-weight:700}\n#sc-tv-root .sc-nav .sc-push{margin-left:auto}\n#sc-tv-root [data-sc-focus=\"true\"]{outline:4px solid #fff!important;outline-offset:5px!important;box-shadow:0 0 0 7px rgba(255,255,255,.12);z-index:2}\n#sc-tv-root .sc-nav [data-sc-focus=\"true\"]{background:#f1f2f5!important;color:#0a0c10!important}\n#sc-tv-root .sc-scroll{height:1080px;overflow-y:auto;overflow-x:hidden;padding-bottom:110px;scrollbar-width:none}\n#sc-tv-root .sc-scroll::-webkit-scrollbar,#sc-tv-root .sc-track::-webkit-scrollbar{display:none}\n#sc-tv-root .sc-hero{height:598px;position:relative;padding:178px 100px 30px;overflow:hidden;background:#0d111b}\n#sc-tv-root .sc-hero-art{position:absolute;top:0;right:0;width:79%;height:100%;object-fit:cover;object-position:center 24%;opacity:.85}\n#sc-tv-root .sc-hero-shade{position:absolute;top:0;right:0;bottom:0;left:0;background:linear-gradient(90deg,#090b10 5%,rgba(9,11,16,.92) 20%,rgba(9,11,16,.45) 54%,rgba(9,11,16,.02) 85%),linear-gradient(0deg,#090b10,transparent 52%)}\n#sc-tv-root .sc-hero-copy{position:relative;max-width:930px;z-index:1}\n#sc-tv-root .sc-eyebrow{font-size:23px;letter-spacing:5px;font-weight:700;color:#c7c9d2;text-transform:uppercase;margin-bottom:12px}\n#sc-tv-root h1{font:800 68px/1.06 Arial,Helvetica,sans-serif;color:#fff;margin:0 0 17px;max-height:145px;overflow:hidden;letter-spacing:-2px;text-shadow:0 2px 18px rgba(0,0,0,.3)}\n#sc-tv-root .sc-meta{font-size:25px;color:#b9bdc9;margin-bottom:15px;min-height:32px}\n#sc-tv-root .sc-score{color:#7fe3ad;font-weight:700}\n#sc-tv-root .sc-description{font-size:28px;line-height:1.4;color:#d2d4dd;margin:0 0 25px;max-width:790px;max-height:80px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}\n#sc-tv-root .sc-actions{display:flex;align-items:center;margin:18px 0}\n#sc-tv-root .sc-action{display:inline-block;border-radius:9px;padding:17px 27px!important;background:#2a2e3b;min-height:72px;font-size:29px;font-weight:700;white-space:nowrap}\n#sc-tv-root .sc-action.sc-primary{background:#f5f5f7;color:#0b0d11}\n#sc-tv-root .sc-action.sc-red{background:#e32943;color:#fff}\n#sc-tv-root .sc-row{padding:12px 0 13px 100px;position:relative}\n#sc-tv-root .sc-row h2,#sc-tv-root .sc-section-title{font:700 31px/1.25 Arial,Helvetica,sans-serif;margin:0 0 19px;color:#f5f5f7}\n#sc-tv-root .sc-track{display:flex;overflow-x:auto;overflow-y:hidden;padding:9px 100px 16px 9px;margin-left:-9px;scrollbar-width:none}\n#sc-tv-root .sc-card{flex:0 0 310px;width:310px;padding:0;background:transparent;border-radius:9px;position:relative;display:block}\n#sc-tv-root .sc-card-art{width:310px;height:174px;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#202738,#111722);position:relative}\n#sc-tv-root .sc-card img{display:block;width:100%;height:100%;object-fit:cover}\n#sc-tv-root .sc-card-title{display:block;font-size:30px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:11px;color:#f1f2f6}\n#sc-tv-root .sc-card-meta{display:block;font-size:24px;color:#9299ab;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#sc-tv-root .sc-card [data-rank]{position:absolute;bottom:5px;left:12px;font-size:65px;line-height:1;font-weight:900;color:white;text-shadow:0 2px 8px #000}\n#sc-tv-root .sc-card[data-sc-focus=\"true\"] .sc-card-title{color:#fff}\n#sc-tv-root .sc-titlebar{padding:152px 100px 26px}\n#sc-tv-root .sc-titlebar h1{font-size:54px;max-height:none;margin-bottom:12px}\n#sc-tv-root .sc-titlebar p{font-size:27px;color:#9da4b6;margin:0}\n#sc-tv-root .sc-grid{display:flex;flex-wrap:wrap;padding:10px 100px 40px}\n#sc-tv-root .sc-grid .sc-card{flex-basis:320px;width:320px;margin-bottom:12px}\n#sc-tv-root .sc-grid .sc-card-art{width:320px;height:180px}\n#sc-tv-root .sc-search-form{display:flex;padding:0 100px 35px}\n#sc-tv-root .sc-search-form input{background:#202532;color:white;padding:21px 25px;border-radius:10px;width:100%;font-size:36px;height:88px;outline:none}\n#sc-tv-root .sc-search-form input::placeholder{color:#8f97a9}\n#sc-tv-root .sc-search-form button{min-width:175px}\n#sc-tv-root .sc-empty{padding:35px 100px;font-size:30px;color:#aab0bf;max-width:1400px}\n#sc-tv-root .sc-status{position:absolute;right:72px;bottom:34px;color:#b5b9c7;background:rgba(17,21,31,.96);font-size:24px;border:1px solid #333a4b;padding:14px 24px;border-radius:9px;z-index:8;max-width:1450px}\n#sc-tv-root .sc-loading{position:absolute;top:108px;right:0;bottom:0;left:0;background:rgba(9,11,16,.88);z-index:9;display:flex;align-items:center;justify-content:center;font-size:34px}\n#sc-tv-root .sc-bottom-hint{position:absolute;bottom:0;left:0;right:0;height:63px;padding:19px 100px;background:linear-gradient(transparent,#090b10 40%);font-size:20px;color:#737c90;pointer-events:none;z-index:5}\n#sc-tv-root .sc-details .sc-hero{height:640px;padding-top:176px}\n#sc-tv-root .sc-details .sc-description{max-height:120px;-webkit-line-clamp:3}\n#sc-tv-root .sc-seasons{display:flex;padding:3px 100px 30px;overflow-x:auto}\n#sc-tv-root .sc-season{padding:15px 24px;border-radius:9px;font-size:28px;background:#242a39;white-space:nowrap}\n#sc-tv-root .sc-season.sc-selected{background:#e5e6ec;color:#121621}\n#sc-tv-root .sc-episode{display:flex;align-items:center;width:100%;min-height:106px;padding:19px 28px;margin:0 0 16px;border-radius:9px;background:#161b27;font-size:29px}\n#sc-tv-root .sc-episode-number{font-size:35px;color:#737e96;width:55px;flex-shrink:0;font-weight:700}\n#sc-tv-root .sc-episode-copy{flex:1;min-width:0}\n#sc-tv-root .sc-episode-copy span{display:block;color:#a9b1c3;font-size:23px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#sc-tv-root .sc-episodes{padding:0 100px 30px}\n#sc-tv-root .sc-modal-shade{position:absolute;top:0;right:0;bottom:0;left:0;z-index:15;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center}\n#sc-tv-root .sc-modal{width:1320px;background:#171d2a;border:1px solid #3a455b;border-radius:18px;padding:52px}\n#sc-tv-root .sc-modal h2{font-size:44px;margin:0 0 24px;color:#fff}\n#sc-tv-root .sc-modal p{font-size:29px;line-height:1.5;color:#c0c7d5;margin:18px 0}\n#sc-tv-root .sc-modal .sc-actions{margin-top:35px;gap:24px}\n#sc-tv-root .sc-error{padding:190px 100px 40px;max-width:1500px}\n#sc-tv-root .sc-error h1{font-size:58px;max-height:none}\n#sc-tv-root .sc-error p{font-size:31px;color:#b5bed0;line-height:1.6}\n\n/* Explicit margins keep spacing on Tizen engines without flex-gap support. */\n#sc-tv-root .sc-nav button,#sc-tv-root .sc-nav a{margin-right:14px}\n#sc-tv-root .sc-nav button:last-child,#sc-tv-root .sc-nav a:last-child{margin-right:0}\n#sc-tv-root .sc-actions>*+*{margin-left:22px}\n#sc-tv-root .sc-track .sc-card+.sc-card{margin-left:24px}\n#sc-tv-root .sc-grid .sc-card{margin:0 24px 30px 0}\n#sc-tv-root .sc-search-form input{margin-right:24px}\n#sc-tv-root .sc-seasons button+button{margin-left:20px}\n#sc-tv-root .sc-episode>span+span{margin-left:28px}\n";
  var homeLink = document.createElement('a');
  homeLink.href = HOME_URL;
  if (location.hostname !== homeLink.hostname || window.top !== window.self || window.__scTV) return;
  window.__scTV = { version: VERSION, mode: 'starting' };
  var origin = homeLink.protocol + '//' + homeLink.host;
  var locale = (location.pathname.match(/^\/(en|it)(\/|$)/) || [null, 'en'])[1];
  var cdn = 'https://cdn.streamingcommunityz.boo';
  var root, content, notice, loading, overlay, style;
  var state, homePage, homeReady = false, screenScale = 1, current, rows = [], stack = [], favourites = [];
  var requestId = 0, activeRequest = null, busy = false, noticeTimer;
  var detailCache = {}, previousFocus, modalOpen = false;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function readStore(store, key, fallback) {
    try { return JSON.parse(store.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function saveStore(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function normalise(title) {
    title = title || {};
    return { id: Number(title.id), slug: String(title.slug || ''), name: String(title.name || 'Titolo'),
      type: title.type === 'tv' ? 'tv' : (title.type === 'movie' ? 'movie' : ''), score: title.score, plot: title.plot || '',
      release_date: title.release_date || title.last_air_date || '', runtime: title.runtime,
      seasons_count: title.seasons_count, images: title.images || [], genres: title.genres || [], raw: title };
  }
  function valid(title) { return title && isFinite(Number(title.id)) && Number(title.id) > 0; }
  function picture(title, kinds) {
    var images = title.images || [];
    for (var k = 0; k < kinds.length; k++) {
      for (var i = 0; i < images.length; i++) {
        if (images[i].type === kinds[k] && images[i].filename) {
          return cdn + '/images/' + encodeURIComponent(images[i].filename);
        }
      }
    }
    return '';
  }
  function titlePath(title) {
    return '/' + locale + '/titles/' + encodeURIComponent(title.id) + '-' + encodeURIComponent(title.slug);
  }
  function meta(title) {
    var parts = [];
    if (title.score && Number(title.score) > 0) parts.push('<span class="sc-score">' + esc(title.score) + ' / 10</span>');
    if (title.release_date) parts.push(esc(String(title.release_date).slice(0, 4)));
    if (title.type) parts.push(title.type === 'tv' ? 'Serie TV' : 'Film');
    if (title.runtime) parts.push(esc(title.runtime) + ' min');
    if (title.seasons_count) parts.push(esc(title.seasons_count) + (Number(title.seasons_count) === 1 ? ' stagione' : ' stagioni'));
    return parts.join(' &nbsp;·&nbsp; ');
  }
  function inList(id) { return favourites.some(function (t) { return Number(t.id) === Number(id); }); }
  function toggleList(title) {
    if (inList(title.id)) favourites = favourites.filter(function (t) { return Number(t.id) !== Number(title.id); });
    else favourites.unshift({id:title.id, slug:title.slug, name:title.name, type:title.type, score:title.score,
      images:title.images, release_date:title.release_date, seasons_count:title.seasons_count});
    favourites = favourites.slice(0, 200);
    saveStore(window.localStorage, 'sctv-list', favourites);
    render('detail-list');
    notify(inList(title.id) ? 'Aggiunto alla tua lista' : 'Rimosso dalla tua lista');
  }
  function parsePage(text) {
    var trimmed = text.replace(/^\s+/, '');
    if (trimmed.charAt(0) === '{') {
      var json = JSON.parse(trimmed);
      if (json.props) return json;
    }
    var doc = new DOMParser().parseFromString(text, 'text/html');
    var el = doc.querySelector('[data-page]');
    if (!el) throw new Error('Il sito non ha restituito i dati del catalogo.');
    var page = JSON.parse(el.getAttribute('data-page'));
    if (!page.props) throw new Error('Formato del catalogo non riconosciuto.');
    return page;
  }
  function requestPage(path) {
    return new Promise(function (resolve, reject) {
      if (path.charAt(0) !== '/' || path.slice(0, 2) === '//') { reject(new Error('Indirizzo del catalogo non valido.')); return; }
      var xhr = new XMLHttpRequest();
      activeRequest = xhr;
      xhr.open('GET', origin + path, true);
      xhr.timeout = 18000;
      xhr.setRequestHeader('Accept', 'text/html, application/xhtml+xml');
      xhr.onload = function () {
        if (xhr.status < 200 || xhr.status >= 300) { reject(new Error('Il sito ha risposto con errore ' + xhr.status + '.')); return; }
        try { resolve(parsePage(xhr.responseText)); } catch (e) { reject(e); }
      };
      xhr.onerror = function () { reject(new Error('Impossibile collegarsi al catalogo.')); };
      xhr.ontimeout = function () { reject(new Error('Il sito impiega troppo tempo a rispondere.')); };
      xhr.onabort = function () { reject(new Error('Caricamento annullato.')); };
      xhr.send();
    });
  }
  function notify(text) {
    if (!notice) return;
    notice.textContent = text;
    notice.hidden = false;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(function () { notice.hidden = true; }, 4500);
  }
  function setBusy(value) { busy = value; loading.hidden = !value; }
  function snapshot() {
    if (state) { state.focus = current && current.getAttribute('data-key'); state.scroll = content.scrollTop; }
    return state;
  }
  function show(next, push) {
    if (push && state) stack.push(snapshot());
    state = next;
    render(next.focus);
  }
  function getPage(path, onSuccess) {
    var token = ++requestId;
    if (activeRequest) activeRequest.abort();
    setBusy(true);
    requestPage(path).then(function (page) {
      if (token !== requestId) return;
      activeRequest = null;
      setBusy(false);
      onSuccess(page);
    }).catch(function (error) {
      if (token !== requestId) return;
      activeRequest = null;
      setBusy(false);
      notify(error.message + ' Usa Info/blu per aprire il sito originale.');
    });
  }
  function openTitle(title, push) {
    var path = titlePath(title);
    if (detailCache[path]) { show({kind:'detail', page:detailCache[path], path:path}, push !== false); return; }
    getPage(path, function (page) {
      if (!page.props.title || !valid(page.props.title)) { notify('Scheda del titolo non disponibile.'); return; }
      detailCache[path] = page;
      show({kind:'detail', page:page, path:path}, push !== false);
    });
  }
  function watchURL(title, episode) {
    return origin + '/' + locale + '/watch/' + encodeURIComponent(title.id) +
      (episode ? '?e=' + encodeURIComponent(episode.id) : '');
  }
  function play(title, episode) {
    saveStore(window.sessionStorage, 'sctv-return', {path:state.path || '', kind:state.kind,
      focus:current && current.getAttribute('data-key')});
    // The anchor performs normal navigation after this state has been saved.
  }
  function goHome(filter) {
    if (!homeReady) {
      getPage('/' + locale, function (page) { homePage = page; homeReady = true; goHome(filter); });
      return;
    }
    ++requestId;
    if (activeRequest) activeRequest.abort();
    setBusy(false);
    stack = [];
    show({kind:'home', page:homePage, filter:filter || 'all', path:'/' + locale}, false);
  }
  function back() {
    if (modalOpen) { closeHelp(); return; }
    if (busy) { ++requestId; if (activeRequest) activeRequest.abort(); setBusy(false); return; }
    if (stack.length) { show(stack.pop(), false); return; }
    if (state.kind !== 'home' || state.filter !== 'all') { goHome(); return; }
    openHelp();
  }
  function addRow() { rows.push([]); return rows.length - 1; }
  function wire(el, row, key, action) {
    if (!el) return;
    el.setAttribute('data-key', key);
    el.setAttribute('data-row', row);
    el.setAttribute('data-col', rows[row].length);
    rows[row].push(el);
    if (action) el.onclick = action;
    el.onfocus = function () { setFocus(el, false); };
  }
  function setFocus(el, perform) {
    if (!el) return;
    if (current && current !== el) current.removeAttribute('data-sc-focus');
    current = el;
    el.setAttribute('data-sc-focus', 'true');
    if (perform !== false) {
      try { el.focus({preventScroll:true}); } catch (e) { el.focus(); }
    }
    // Explicit scroll arithmetic keeps the fixed TV header clear.
    var track = el.parentElement;
    if (track && track.classList.contains('sc-track')) {
      var desired = el.offsetLeft - track.offsetLeft - 10;
      if (el.offsetLeft + el.offsetWidth > track.scrollLeft + track.clientWidth - 80) track.scrollLeft = Math.max(0, desired - track.clientWidth + el.offsetWidth + 110);
      else if (desired < track.scrollLeft) track.scrollLeft = Math.max(0, desired);
    }
    if (perform !== false && !modalOpen && el.getAttribute('data-row') !== '0') {
      var rect = el.getBoundingClientRect();
      var scale = screenScale;
      var bottom = window.innerHeight - 82 * scale;
      if (rect.bottom > bottom) content.scrollTop += (rect.bottom - bottom) / scale;
      if (rect.top < 135 * scale) content.scrollTop -= (135 * scale - rect.top) / scale;
    }
  }
  function move(code) {
    var r = current ? Number(current.getAttribute('data-row')) : 0;
    var c = current ? Number(current.getAttribute('data-col')) : 0;
    if (code === 37) c--;
    if (code === 39) c++;
    if (code === 38) r--;
    if (code === 40) r++;
    if (!rows[r] || !rows[r].length) return;
    c = Math.max(0, Math.min(c, rows[r].length - 1));
    setFocus(rows[r][c]);
  }
  function navHTML() {
    var filter = state.kind === 'home' ? state.filter : '';
    return '<header class="sc-top"><div class="sc-logo">SC<span>TV</span></div><nav class="sc-nav" aria-label="Navigazione">' +
      '<button data-nav="all" class="' + (filter === 'all' ? 'sc-selected' : '') + '">Home</button>' +
      '<button data-nav="movie" class="' + (filter === 'movie' ? 'sc-selected' : '') + '">Film</button>' +
      '<button data-nav="tv" class="' + (filter === 'tv' ? 'sc-selected' : '') + '">Serie TV</button>' +
      '<button data-nav="list">La mia lista</button>' +
      '<button data-nav="search" class="sc-push">⌕ &nbsp;Cerca</button>' +
      '<a data-nav="language" href="' + origin + '/' + (locale === 'it' ? 'en' : 'it') + '">' + (locale === 'it' ? 'IT' : 'EN') + '</a></nav></header>';
  }
  function wireNav() {
    var row = addRow();
    ['all', 'movie', 'tv', 'list', 'search', 'language'].forEach(function (name) {
      wire(root.querySelector('[data-nav="' + name + '"]'), row, 'nav-' + name, function () {
        if (name === 'list') show({kind:'list'}, true);
        else if (name === 'search') { show({kind:'search', query:'', titles:[]}, true); setFocus(root.querySelector('input')); }
        else if (name === 'language') return; // Normal same-origin navigation keeps the locale on return from playback.
        else goHome(name);
      });
    });
  }
  function heroHTML(title, details) {
    var art = picture(title, ['background', 'cover', 'cover_mobile']);
    return '<section class="sc-hero">' + (art ? '<img class="sc-hero-art" src="' + esc(art) + '" alt="">' : '') +
      '<div class="sc-hero-shade"></div><div class="sc-hero-copy"><div class="sc-eyebrow">' +
      (details ? (title.type === 'tv' ? 'Serie TV' : 'Film') : 'In evidenza') + '</div>' +
      '<h1>' + esc(title.name) + '</h1><div class="sc-meta">' + meta(title) + '</div>' +
      '<p class="sc-description">' + esc(title.plot) + '</p><div class="sc-actions">' +
      '<a class="sc-action sc-primary" data-hero="play" href="' + esc(watchURL(title)) + '">▶ &nbsp;Guarda</a>' +
      '<button class="sc-action" data-hero="' + (details ? 'list' : 'details') + '">' +
      (details ? (inList(title.id) ? '✓ Nella mia lista' : '+ La mia lista') : 'ⓘ &nbsp;Dettagli') + '</button>' +
      '</div></div></section>';
  }
  function wireHero(title, details) {
    var row = addRow();
    wire(root.querySelector('[data-hero="play"]'), row, 'hero-play', function () { play(title); });
    var action = details ? 'list' : 'details';
    wire(root.querySelector('[data-hero="' + action + '"]'), row, details ? 'detail-list' : 'hero-details', function () {
      if (details) toggleList(title); else openTitle(title);
    });
  }
  function cardHTML(title, key, rank) {
    var art = picture(title, ['cover', 'cover_mobile', 'background', 'poster']);
    return '<button class="sc-card" data-card="' + esc(key) + '" aria-label="' + esc(title.name) + '">' +
      '<div class="sc-card-art">' + (art ? '<img src="' + esc(art) + '" alt="" loading="lazy">' : '') +
      (rank ? '<span data-rank="' + rank + '">' + rank + '</span>' : '') + '</div>' +
      '<span class="sc-card-title">' + esc(title.name) + '</span><span class="sc-card-meta">' +
      (title.type === 'tv' ? 'Serie TV' : 'Film') + (title.score ? ' · ' + esc(title.score) + ' / 10' : '') + '</span></button>';
  }
  function wireCards(titles, prefix, grid) {
    var row;
    titles.forEach(function (raw, i) {
      if (!grid || i % 5 === 0) { if (grid || i === 0) row = addRow(); }
      var key = prefix + i;
      wire(root.querySelector('[data-card="' + key + '"]'), row, key, function () { openTitle(normalise(raw)); });
    });
  }
  function label(slider) {
    return {trending:'Di tendenza', latest:'Aggiunti di recente', top10:'Top 10 oggi'}[slider.name] || slider.label || 'Da scoprire';
  }
  function homeHTML() {
    var props = state.page.props;
    var filter = state.filter;
    var lists = (props.sliders || []).map(function (slider) {
      return {name:slider.name, label:label(slider), titles:(slider.titles || []).filter(function (t) {
        return valid(t) && (filter === 'all' || t.type === filter);
      })};
    }).filter(function (s) { return s.titles.length; });
    state.lists = lists;
    var featured = props.title;
    if (!valid(featured) || (filter !== 'all' && featured.type !== filter)) featured = lists[0] && lists[0].titles[0];
    state.hero = featured && normalise(featured);
    var html = state.hero ? heroHTML(state.hero, false) : '<div class="sc-titlebar"><h1>Catalogo</h1></div>';
    lists.forEach(function (s, r) {
      html += '<section class="sc-row"><h2>' + esc(s.label) + '</h2><div class="sc-track">';
      s.titles.forEach(function (t, i) { html += cardHTML(normalise(t), 's' + r + '-' + i, s.name === 'top10' ? i + 1 : 0); });
      html += '</div></section>';
    });
    if (!lists.length) html += '<p class="sc-empty">Nessun titolo disponibile in questa categoria.</p>';
    return html;
  }
  function gridHTML(titles, prefix) {
    var html = '<div class="sc-grid">';
    titles.forEach(function (t, i) { html += cardHTML(normalise(t), prefix + i); });
    return html + '</div>';
  }
  function searchHTML() {
    return '<div class="sc-titlebar"><h1>Cosa vuoi guardare?</h1><p>Cerca un film o una serie TV.</p></div>' +
      '<form class="sc-search-form"><input type="search" maxlength="160" aria-label="Cerca un titolo" placeholder="Titolo del film o della serie" value="' + esc(state.query) + '">' +
      '<button type="submit" class="sc-action sc-primary">Cerca</button></form>' +
      (state.titles.length ? gridHTML(state.titles, 'result-') : '<p class="sc-empty">' +
      (state.searched ? 'Nessun risultato per questa ricerca.' : 'Scrivi un titolo con la tastiera della TV e conferma con Cerca.') + '</p>');
  }
  function search() {
    var input = root.querySelector('input');
    var query = input.value.replace(/^\s+|\s+$/g, '').slice(0, 160);
    if (!query) { notify('Scrivi il titolo da cercare.'); setFocus(input); return; }
    getPage('/' + locale + '/search?q=' + encodeURIComponent(query), function (page) {
      var titles = page.props.titles || [];
      if (!Array.isArray(titles)) titles = titles.data || [];
      show({kind:'search', query:query, titles:titles.filter(valid), searched:true, focus:titles.length ? 'result-0' : 'search-submit'}, false);
    });
  }
  function detailHTML() {
    var props = state.page.props;
    var title = normalise(props.title);
    state.title = title;
    var html = '<div class="sc-details">' + heroHTML(title, true);
    var seasons = title.raw.seasons || [];
    var loaded = props.loadedSeason || {};
    if (seasons.length) {
      html += '<div class="sc-seasons">';
      seasons.forEach(function (s, i) {
        html += '<button class="sc-season ' + (Number(s.id) === Number(loaded.id) ? 'sc-selected' : '') + '" data-season="' + i + '">Stagione ' + esc(s.number) + '</button>';
      });
      html += '</div><div class="sc-episodes">';
      (loaded.episodes || []).forEach(function (e, i) {
        html += '<a class="sc-episode" data-episode="' + i + '" href="' + esc(watchURL(title, e)) + '"><span class="sc-episode-number">' + esc(e.number) + '</span>' +
          '<span class="sc-episode-copy">' + esc(e.name || ('Episodio ' + e.number)) + '<span>' + esc(e.plot || '') + '</span></span>' +
          '<span>' + (e.duration ? esc(e.duration) + ' min' : '▶') + '</span></a>';
      });
      html += '</div>';
    }
    return html + '</div>';
  }
  function wireDetails() {
    wireHero(state.title, true);
    var seasons = state.title.raw.seasons || [];
    var loaded = state.page.props.loadedSeason || {};
    if (seasons.length) {
      var r = addRow();
      seasons.forEach(function (season, i) {
        wire(root.querySelector('[data-season="' + i + '"]'), r, 'season-' + i, function () {
          var path = titlePath(state.title) + '/season-' + encodeURIComponent(season.number);
          getPage(path, function (page) { show({kind:'detail', page:page, path:path, focus:'season-' + i}, false); });
        });
      });
      (loaded.episodes || []).forEach(function (episode, i) {
        wire(root.querySelector('[data-episode="' + i + '"]'), addRow(), 'episode-' + i, function () { play(state.title, episode); });
      });
    }
  }
  function render(focusKey) {
    rows = []; current = null;
    var html = navHTML() + '<main class="sc-scroll">';
    if (state.kind === 'home') html += homeHTML();
    if (state.kind === 'detail') html += detailHTML();
    if (state.kind === 'search') html += searchHTML();
    if (state.kind === 'list') html += '<div class="sc-titlebar"><h1>La mia lista</h1><p>I titoli salvati su questa TV.</p></div>' +
      (favourites.length ? gridHTML(favourites, 'saved-') : '<p class="sc-empty">Apri i dettagli di un titolo e scegli “La mia lista” per salvarlo.</p>');
    html += '</main><div class="sc-bottom-hint">Frecce per navigare &nbsp;·&nbsp; OK per scegliere &nbsp;·&nbsp; Return per tornare &nbsp;·&nbsp; Info / blu per aiuto</div>';
    root.innerHTML = html;
    content = root.querySelector('.sc-scroll');
    notice = document.createElement('div'); notice.className = 'sc-status'; notice.hidden = true; notice.setAttribute('role', 'status'); root.appendChild(notice);
    loading = document.createElement('div'); loading.className = 'sc-loading'; loading.textContent = 'Caricamento…'; loading.hidden = true; loading.setAttribute('role', 'status'); root.appendChild(loading);
    wireNav();
    if (state.kind === 'home') {
      if (state.hero) wireHero(state.hero, false);
      state.lists.forEach(function (s, i) { wireCards(s.titles, 's' + i + '-', false); });
    }
    if (state.kind === 'detail') wireDetails();
    if (state.kind === 'search') {
      var row = addRow();
      wire(root.querySelector('input'), row, 'search-input');
      wire(root.querySelector('form button'), row, 'search-submit');
      root.querySelector('form').onsubmit = function (e) { e.preventDefault(); search(); };
      wireCards(state.titles, 'result-', true);
    }
    if (state.kind === 'list') wireCards(favourites, 'saved-', true);
    content.scrollTop = state.scroll || 0;
    var selected = null;
    rows.forEach(function (row) { row.forEach(function (el) { if (el.getAttribute('data-key') === focusKey) selected = el; }); });
    setFocus(selected || (rows[1] && rows[1][0]) || rows[0][0]);
    window.__scTV.mode = 'catalogue';
  }
  function closeHelp() {
    if (!modalOpen) return;
    overlay.remove(); modalOpen = false;
    var key = previousFocus;
    render(key);
  }
  function openHelp() {
    if (modalOpen) { closeHelp(); return; }
    previousFocus = current && current.getAttribute('data-key');
    if (state) state.scroll = content.scrollTop;
    overlay = document.createElement('div'); overlay.className = 'sc-modal-shade';
    overlay.innerHTML = '<section class="sc-modal" role="dialog" aria-modal="true" aria-label="Comandi SC TV"><h2>SC TV <small>' + VERSION + '</small></h2>' +
      '<p>Frecce: naviga fra titoli e pulsanti. OK: seleziona. Return: torna indietro.</p>' +
      '<p>In Cerca usa la tastiera della TV; Return esce dal campo di testo.</p>' +
      '<p>La riproduzione usa il lettore del sito. Nel lettore, il tasto blu torna al catalogo quando la pagina riceve il comando.</p>' +
      '<div class="sc-actions"><button class="sc-action sc-primary" data-help="close">Continua</button><button class="sc-action" data-help="original">Sito originale</button>' +
      '<button class="sc-action" data-help="exit">Esci</button></div></section>';
    root.appendChild(overlay); modalOpen = true;
    rows = []; var row = addRow();
    wire(overlay.querySelector('[data-help="close"]'), row, 'help-close', closeHelp);
    wire(overlay.querySelector('[data-help="original"]'), row, 'help-original', function () {
      ++requestId; if (activeRequest) activeRequest.abort();
      root.remove(); style.remove(); document.documentElement.classList.remove('sc-tv-active');
      window.removeEventListener('keydown', onKey, true);
      window.__scTV.mode = 'original';
    });
    wire(overlay.querySelector('[data-help="exit"]'), row, 'help-exit', function () {
      try { window.tizen.application.getCurrentApplication().exit(); }
      catch (e) { if (history.length > 1) history.back(); else closeHelp(); }
    });
    setFocus(rows[0][0]);
  }
  function consume(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  function onKey(e) {
    var keys = {ArrowLeft:37, ArrowUp:38, ArrowRight:39, ArrowDown:40, Enter:13, Escape:27, BrowserBack:10009, Info:457, ColorF3Blue:406};
    var code = e.keyCode || keys[e.key];
    if (e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;
    if (code === 27 || code === 10009) {
      consume(e);
      if (e.repeat) return;
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        document.activeElement.blur(); setFocus(root.querySelector('form button')); return;
      }
      back(); return;
    }
    if (code === 406 || code === 457) { consume(e); if (!e.repeat && !busy) openHelp(); return; }
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (busy && ((code >= 37 && code <= 40) || code === 13)) { consume(e); return; }
    if (code >= 37 && code <= 40) { consume(e); move(code); }
    if (code === 13 && current) { consume(e); if (!e.repeat) current.click(); }
  }
  function resize() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    screenScale = scale;
    root.style.transform = 'scale(' + scale + ')';
    root.style.left = Math.max(0, (window.innerWidth - 1920 * scale) / 2) + 'px';
    root.style.top = Math.max(0, (window.innerHeight - 1080 * scale) / 2) + 'px';
  }
  function playerMode() {
    window.__scTV.mode = 'player';
    // Tizen 3 (Chromium 47) cannot start the site's type="module" watch bundle.
    // Mount only the same iframe page the server already provided. Its player,
    // authentication, stream selection and access checks remain in place.
    var legacy = !('noModule' in document.createElement('script'));
    window.__scTV.player = {legacyBootstrap:legacy, engine:'site-iframe', verifiedPlayback:false};
    if (legacy) {
      var data = document.querySelector('[data-page]');
      var page;
      try { page = data && JSON.parse(data.getAttribute('data-page')); } catch (e) {}
      if (page && page.component === 'Titles/Watch' && page.props) {
        if (page.props.redirectToLogin) {
          window.__scTV.player.reason = 'site-requires-login';
        } else if (page.props.embedUrl) {
          var url = document.createElement('a');
          url.href = page.props.embedUrl;
          if (url.protocol === homeLink.protocol && url.host === homeLink.host &&
              /^\/(en|it)\/iframe\/[0-9]+$/.test(url.pathname)) {
            var playerStyle = document.createElement('style');
            playerStyle.textContent = '#sc-tv-player{position:fixed;top:0;right:0;bottom:0;left:0;background:black;z-index:2147483645;}' +
              '#sc-tv-player iframe{display:block;width:100%;height:100%;border:0;}' +
              '#sc-tv-player-back{position:absolute;left:3%;top:3%;font:24px/1.4 Arial,sans-serif;padding:13px 22px;' +
              'color:white;background:rgba(15,18,28,.9);border:2px solid #798295;border-radius:8px;z-index:1;}' +
              '#sc-tv-player-back:focus{outline:4px solid white;}' +
              'html.sc-tv-player-active,html.sc-tv-player-active body{margin:0!important;overflow:hidden!important;}' +
              'html.sc-tv-player-active #app{display:none!important;}';
            (document.head || document.documentElement).appendChild(playerStyle);
            var playerRoot = document.createElement('div');
            playerRoot.id = 'sc-tv-player';
            var frame = document.createElement('iframe');
            frame.title = 'Lettore video del sito';
            frame.src = url.href;
            frame.setAttribute('allowfullscreen', '');
            frame.setAttribute('webkitallowfullscreen', '');
            frame.setAttribute('allow', 'autoplay; fullscreen');
            playerRoot.appendChild(frame);
            var returnButton = document.createElement('button');
            returnButton.id = 'sc-tv-player-back';
            returnButton.type = 'button';
            returnButton.textContent = '‹ Catalogo';
            returnButton.onclick = function () { window.location.assign(origin + '/' + locale); };
            playerRoot.appendChild(returnButton);
            document.body.appendChild(playerRoot);
            document.documentElement.classList.add('sc-tv-player-active');
            window.__scTV.player.iframeMounted = true;
          } else window.__scTV.player.reason = 'unexpected-embed-address';
        }
      }
    }
    window.addEventListener('keydown', function (e) {
      var code = e.keyCode;
      if (code === 406 && !e.repeat) { consume(e); window.location.assign(origin + '/' + locale); }
    }, true);
  }
  function init() {
    if (/\/(watch|iframe)\//.test(location.pathname)) { playerMode(); return; }
    var element = document.querySelector('[data-page]');
    if (!element) { window.__scTV.mode = 'unavailable'; return; }
    var page;
    try { page = JSON.parse(element.getAttribute('data-page')); } catch (e) { window.__scTV.mode = 'unavailable'; return; }
    if (!page.props || !(/Home\/Home|Titles\/Browse|Titles\/Title/.test(page.component || ''))) { window.__scTV.mode = 'original'; return; }
    locale = page.props.locale === 'it' ? 'it' : 'en';
    if (/^https:\/\/[a-z0-9.-]+$/i.test(page.props.cdn_url || '')) cdn = page.props.cdn_url;
    favourites = readStore(window.localStorage, 'sctv-list', []);
    if (!Array.isArray(favourites)) favourites = [];
    favourites = favourites.filter(valid).slice(0, 200);
    homeReady = /Home\/Home/.test(page.component);
    homePage = homeReady ? page : null;
    style = document.createElement('style'); style.id = 'sc-tv-style'; style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
    root = document.createElement('div'); root.id = 'sc-tv-root'; root.setAttribute('lang', 'it'); document.body.appendChild(root);
    document.documentElement.classList.add('sc-tv-active');
    Array.prototype.forEach.call(document.querySelectorAll('#app video'), function (v) { try { v.pause(); } catch (e) {} });
    if (!homePage) homePage = {props:{sliders:page.props.sliders || [], title:page.props.title}};
    if (/Titles\/Title/.test(page.component)) state = {kind:'detail', page:page, path:location.pathname};
    else if (/Titles\/Browse/.test(page.component)) {
      var titles = page.props.titles || [];
      state = {kind:'search', query:'', titles:Array.isArray(titles) ? titles : titles.data || [], searched:true};
    } else state = {kind:'home', page:page, filter:'all', path:'/' + locale};
    resize(); render();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKey, true);
    var restore = readStore(window.sessionStorage, 'sctv-return', null);
    try { window.sessionStorage.removeItem('sctv-return'); } catch (e) {}
    if (restore && restore.kind === 'detail' && restore.path && restore.path.indexOf('/' + locale + '/titles/') === 0) {
      getPage(restore.path, function (savedPage) { show({kind:'detail', page:savedPage, path:restore.path, focus:restore.focus}, true); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
}());
