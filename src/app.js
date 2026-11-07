/* SC TV — a television catalogue on the site's own origin. */
(function () {
  'use strict';
  var HOME_URL = 'https://streamingcommunityz.boo/en';
  var VERSION = '0.2.0';
  var CSS = /*__SC_TV_CSS__*/ "";
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
