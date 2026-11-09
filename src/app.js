/* SC TV — a television catalogue on the site's own origin. */
(function () {
  'use strict';
  var HOME_URL = 'https://streamingcommunityz.boo/en';
  var VERSION = '0.4.0';
  var CSS = /*__SC_TV_CSS__*/ "";
  // hls.js 1.5.20 ships an ES5 build that runs on Chromium 47 through MSE and
  // exposes quality, audio and subtitle renditions. Pinned with SRI; loaded only
  // inside the vixcloud player frame.
  var HLS_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js';
  var HLS_INTEGRITY = 'sha384-V5ruNBgmYcC3SJRUQeNykAAAgde5gOFq/Hu0CZj7bygDP0yRIhkvX8+w0u/7mRvr';
  var SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  var homeLink = document.createElement('a');
  homeLink.href = HOME_URL;
  // TizenBrew injects in each frame. Observe only the player embedded by this site.
  // Reports contain media state and error codes, never source URLs or tokens.
  if (window.top !== window.self && location.hostname === 'vixcloud.cc' && /^\/embed\//.test(location.pathname)) {
    var referringPage = document.createElement('a');
    referringPage.href = document.referrer;
    if (referringPage.host === homeLink.host && referringPage.protocol === homeLink.protocol) observePlayerFrame();
    return;
  }
  if (location.hostname !== homeLink.hostname || window.top !== window.self || window.__scTV) return;
  window.__scTV = { version: VERSION, mode: 'starting' };
  var origin = homeLink.protocol + '//' + homeLink.host;
  var AUTO_URL = 'http://127.0.0.1:8081/module/gh%2Fleobernazzoli%2Fsctv%40a/launcher/index.html';
  var locale = (location.pathname.match(/^\/(en|it)(\/|$)/) || [null, 'en'])[1];
  var cdn = 'https://cdn.streamingcommunityz.boo';
  var root, content, notice, loading, overlay, style;
  var state, homePage, homeReady = false, screenScale = 1, current, rows = [], stack = [], favourites = [];
  var requestId = 0, activeRequest = null, busy = false, noticeTimer;
  var detailCache = {}, previousFocus, modalOpen = false;

  function knownPlayerFeature(value) {
    var names = ['URLSearchParams','URL','fetch','Promise','Object.values','Object.entries','Object.fromEntries',
      'ResizeObserver','IntersectionObserver','AbortController','TextDecoder','TextEncoder','CustomEvent','queueMicrotask','structuredClone'];
    return names.indexOf(value) === -1 ? '' : value;
  }

  function queryValue(name) {
    var parts = location.search.replace(/^\?/, '').split('&');
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      try {
        if (decodeURIComponent(pair[0] || '') === name) return decodeURIComponent(pair.slice(1).join('=').replace(/\+/g, ' '));
      } catch (e) { return ''; }
    }
    return '';
  }
  function decodeTitle(value) {
    if (!value) return '';
    try { return decodeURIComponent(escape(window.atob(value))); } catch (e) { return ''; }
  }
  // Same master playlist address the site's own player script builds from the
  // page data. It stays inside this frame and is never reported to the parent.
  function streamAddress(base) {
    var master = window.masterPlaylist;
    if (!master || typeof base !== 'string' || !/^https:\/\/vixcloud\.cc\/playlist\/[0-9]+(\?[a-z]+=1)?$/.test(base)) return '';
    var params = [], source = master.params && typeof master.params === 'object' ? master.params : {};
    Object.keys(source).forEach(function (name) {
      if (source[name]) params.push(encodeURIComponent(name) + '=' + encodeURIComponent(source[name]));
    });
    if (queryValue('canPlayFHD')) params.push('h=1');
    if (queryValue('scz')) params.push('scz=1');
    params.push('lang=' + encodeURIComponent(queryValue('lang') || 'en'));
    return base + (base.indexOf('?') === -1 ? '?' : '&') + params.join('&');
  }
  function nativeStreamAddress() {
    return window.masterPlaylist ? streamAddress(window.masterPlaylist.url) : '';
  }
  function clock(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '--:--';
    seconds = Math.floor(seconds);
    var h = Math.floor(seconds / 3600), m = Math.floor(seconds / 60) % 60, s = seconds % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function readPlayerPrefs() {
    try {
      var value = JSON.parse(window.localStorage.getItem('sctv-player'));
      return value && typeof value === 'object' ? value : {};
    } catch (e) { return {}; }
  }
  function savePlayerPrefs(prefs) {
    try { window.localStorage.setItem('sctv-player', JSON.stringify(prefs)); } catch (e) {}
  }
  // JW Player 8.36 and the site's embed bundle use async functions and `??`:
  // Chromium 47 (Tizen 3, 2017 TVs) rejects them with a SyntaxError, so no
  // player is ever created. This replaces it with a TV player of our own.
  function mountNativePlayer() {
    if (typeof window.jwplayer === 'function' || document.getElementById('sc-tv-native')) return null;
    if (!nativeStreamAddress()) return null;
    if (!Object.entries) Object.entries = function (o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }); };
    var prefs = readPlayerPrefs();
    var css = document.createElement('style');
    css.textContent = 'html,body{margin:0!important;background:#000!important;overflow:hidden!important;}' +
      '#wrapper{display:none!important;}' +
      '#sc-tv-native{position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:2147483640;}' +
      '#sc-tv-native::cue{font:44px/1.3 Arial,sans-serif;color:#fff;background:rgba(0,0,0,.65);}' +
      '#sc-tv-native-bar{position:fixed;left:0;right:0;bottom:0;padding:28px 4% 34px;z-index:2147483641;color:#fff;' +
      'font:26px/1.4 Arial,sans-serif;background:linear-gradient(transparent,rgba(0,0,0,.85));}' +
      '#sc-tv-native-bar[hidden],#sc-tv-settings[hidden]{display:none!important;}' +
      '#sc-tv-native-title{font-size:34px;font-weight:bold;margin-bottom:10px;}' +
      '#sc-tv-native-track{height:8px;background:rgba(255,255,255,.3);border-radius:4px;margin:12px 0;}' +
      '#sc-tv-native-fill{height:8px;width:0;background:#e50914;border-radius:4px;}' +
      '#sc-tv-settings{position:fixed;right:4%;bottom:190px;width:820px;max-width:92%;box-sizing:border-box;z-index:2147483642;color:#fff;' +
      'font:28px/1.4 Arial,sans-serif;background:rgba(16,20,30,.96);border:2px solid #5d6679;border-radius:14px;padding:22px 0 16px;}' +
      '#sc-tv-settings h2{margin:0 30px 14px;font-size:32px;}#sc-tv-settings h2 small{font-size:20px;color:#9aa3b5;font-weight:normal;margin-left:12px;}' +
      '.sc-tv-setting{display:block;overflow:hidden;padding:13px 30px;}' +
      '.sc-tv-setting b{float:left;font-weight:normal;color:#c9cfdb;}.sc-tv-setting span{float:right;}' +
      '.sc-tv-setting.sc-tv-selected{background:#fff;color:#000;}.sc-tv-setting.sc-tv-selected b{color:#000;}' +
      '#sc-tv-settings p{margin:14px 30px 0;font-size:21px;color:#9aa3b5;}';
    (document.head || document.documentElement).appendChild(css);
    var video = document.createElement('video');
    video.id = 'sc-tv-native';
    video.preload = 'auto';
    video.autoplay = true;
    var bar = document.createElement('div');
    bar.id = 'sc-tv-native-bar';
    var heading = document.createElement('div');
    heading.id = 'sc-tv-native-title';
    heading.textContent = decodeTitle(queryValue('t')) || (window.video && window.video.filename) || '';
    var track = document.createElement('div'); track.id = 'sc-tv-native-track';
    var fill = document.createElement('div'); fill.id = 'sc-tv-native-fill'; track.appendChild(fill);
    var info = document.createElement('div');
    bar.appendChild(heading); bar.appendChild(track); bar.appendChild(info);
    var panel = document.createElement('div');
    panel.id = 'sc-tv-settings'; panel.hidden = true;
    var player = {video:video, hls:null, engine:'', prefs:prefs, notice:''};
    window.__scTVFrame.player = player;

    var servers = [];
    (Array.isArray(window.streams) ? window.streams : []).forEach(function (stream, i) {
      if (stream && streamAddress(stream.url)) servers.push({name:String(stream.name || ('Server ' + (i + 1))), url:stream.url, active:stream.active === true});
    });
    var serverIndex = 0;
    servers.forEach(function (s, i) { if (s.active) serverIndex = i; });
    function currentAddress() { return servers.length ? streamAddress(servers[serverIndex].url) : nativeStreamAddress(); }

    var hideTimer = null, selectedRow = 0, qualityChoice = -1, retried = false, recovered = false;
    function update() {
      var duration = video.duration;
      fill.style.width = (isFinite(duration) && duration > 0 ? Math.min(100, video.currentTime / duration * 100) : 0) + '%';
      var status = player.notice || (video.error ? 'Errore video' : (video.paused ? 'In pausa' : (video.readyState < 3 ? 'Caricamento…' : '')));
      info.textContent = clock(video.currentTime) + ' / ' + clock(duration) + (status ? '   ·   ' + status : '') +
        '   ·   OK pausa · ◀ ▶ 10 s · ▲ ▼ impostazioni · Indietro esce';
    }
    function showBar() {
      update(); bar.hidden = false;
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(function () {
        if (!video.paused && !video.error && panel.hidden) { bar.hidden = true; player.notice = ''; }
      }, 4000);
    }
    player.showBar = showBar;
    ['timeupdate','pause','playing','waiting','loadedmetadata','error'].forEach(function (name) {
      video.addEventListener(name, function () {
        if (!bar.hidden) update();
        if (name === 'pause' || name === 'error') showBar();
      });
    });
    function applySpeed() {
      var speed = SPEEDS.indexOf(Number(prefs.speed)) === -1 ? 1 : Number(prefs.speed);
      video.defaultPlaybackRate = speed; video.playbackRate = speed;
    }
    video.addEventListener('loadedmetadata', applySpeed);
    function play() {
      try {
        var started = video.play();
        if (started && started.catch) started.catch(function () {});
      } catch (e) {}
    }

    // Rendition helpers (hls.js only).
    function levelOrder() {
      var hls = player.hls, order = [];
      if (!hls || !hls.levels) return order;
      hls.levels.forEach(function (level, i) { order.push(i); });
      order.sort(function (a, b) { return (hls.levels[b].height || 0) - (hls.levels[a].height || 0); });
      return order;
    }
    function applyQualityPref() {
      var hls = player.hls; if (!hls || !hls.levels) return;
      // No saved choice: the best rendition offered (1080p when the site grants it).
      var order = levelOrder(), pick = -1;
      if (prefs.quality === 'auto') pick = -1;
      else if (Number(prefs.quality) > 0) {
        // The saved height, or the closest lower one (1080p chosen, only 720p offered).
        order.forEach(function (i) { if (pick === -1 && (hls.levels[i].height || 0) <= Number(prefs.quality)) pick = i; });
        if (pick === -1 && order.length) pick = order[order.length - 1];
      } else if (order.length) pick = order[0];
      qualityChoice = pick;
      hls.currentLevel = pick;
    }
    function trackKey(t) { return String(t.lang || '') + '|' + String(t.name || ''); }
    function applyAudioPref() {
      var hls = player.hls; if (!hls || !hls.audioTracks || !prefs.audio) return;
      hls.audioTracks.forEach(function (t, i) { if (String(t.lang || t.name) === prefs.audio && hls.audioTrack !== i) hls.audioTrack = i; });
    }
    function applySubtitlePref() {
      var hls = player.hls; if (!hls || !hls.subtitleTracks || !prefs.subs) return;
      if (prefs.subs === 'off') { hls.subtitleTrack = -1; return; }
      hls.subtitleDisplay = true;
      hls.subtitleTracks.forEach(function (t, i) { if (trackKey(t) === prefs.subs && hls.subtitleTrack !== i) hls.subtitleTrack = i; });
    }

    function destroyEngine() {
      if (player.hls) { try { player.hls.destroy(); } catch (e) {} player.hls = null; }
      video.removeAttribute('src');
      try { video.load(); } catch (e) {}
    }
    function seekWhenReady(position) {
      if (!(position > 0)) return;
      var resume = function () {
        video.removeEventListener('loadedmetadata', resume);
        try { video.currentTime = position; } catch (e) {}
      };
      video.addEventListener('loadedmetadata', resume);
    }
    function startNative(position) {
      destroyEngine();
      player.engine = 'native';
      video.src = currentAddress();
      seekWhenReady(position);
      play();
    }
    function startHls(position) {
      destroyEngine();
      var Hls = window.Hls;
      var hls = new Hls({enableWorker:true, startPosition:position > 0 ? position : -1, maxBufferLength:30,
        maxBufferSize:40 * 1000 * 1000, backBufferLength:30, subtitleDisplay:prefs.subs !== 'off', renderTextTracksNatively:true});
      player.hls = hls; player.engine = 'hls';
      retried = false; recovered = false;
      hls.on(Hls.Events.MANIFEST_PARSED, function () { applyQualityPref(); play(); });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, applyAudioPref);
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, applySubtitlePref);
      hls.on(Hls.Events.LEVEL_SWITCHED, function () { if (!panel.hidden) renderPanel(); });
      hls.on(Hls.Events.ERROR, function (event, data) {
        if (!data || !data.fatal || player.hls !== hls) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !retried) { retried = true; hls.startLoad(); return; }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) { recovered = true; hls.recoverMediaError(); return; }
        // Keep watching: fall back to the TV's built-in HLS player.
        var at = video.currentTime || position;
        player.fellBack = true; player.notice = 'Lettore avanzato non disponibile: uso il lettore della TV';
        startNative(at); showBar();
      });
      hls.loadSource(currentAddress());
      hls.attachMedia(video);
    }
    function startEngine(position) {
      if (prefs.engine === 'native') { startNative(position); return; }
      function choose() {
        // A resume position that arrived while hls.js was loading becomes the start position.
        if (pendingResume > 0) {
          position = pendingResume; pendingResume = 0;
          player.notice = 'Ripreso da ' + clock(position) + ' · ricomincia dalle impostazioni';
        }
        if (window.Hls && typeof window.Hls.isSupported === 'function' && window.Hls.isSupported()) startHls(position);
        else { player.fellBack = true; startNative(position); }
      }
      if (window.Hls) { choose(); return; }
      var done = false, timer;
      function finish() { if (done) return; done = true; window.clearTimeout(timer); choose(); }
      var script = document.createElement('script');
      script.src = HLS_URL; script.integrity = HLS_INTEGRITY; script.crossOrigin = 'anonymous';
      script.onload = finish; script.onerror = finish;
      timer = window.setTimeout(finish, 10000);
      (document.head || document.documentElement).appendChild(script);
    }
    function restart() {
      var at = video.currentTime;
      if (player.engine === 'hls' && prefs.engine !== 'native' && window.Hls) startHls(at);
      else startEngine(at);
    }

    // Settings rows, built from what the current stream actually offers.
    function settingRows() {
      var hls = player.hls, rows = [];
      if (hls && hls.levels && hls.levels.length > 1) {
        var order = levelOrder(), autoLabel = 'Auto';
        if (qualityChoice === -1 && hls.levels[hls.currentLevel]) autoLabel += ' (' + hls.levels[hls.currentLevel].height + 'p)';
        var options = [autoLabel];
        order.forEach(function (i) { options.push((hls.levels[i].height || '?') + 'p'); });
        rows.push({label:'Qualità', options:options, current:qualityChoice === -1 ? 0 : order.indexOf(qualityChoice) + 1, apply:function (n) {
          qualityChoice = n === 0 ? -1 : order[n - 1];
          prefs.quality = n === 0 ? 'auto' : hls.levels[qualityChoice].height;
          hls.currentLevel = qualityChoice;
        }});
      }
      if (hls && hls.audioTracks && hls.audioTracks.length > 1) {
        rows.push({label:'Audio', options:hls.audioTracks.map(function (t) { return t.name || t.lang || 'Traccia'; }),
          current:Math.max(0, hls.audioTrack), apply:function (n) { hls.audioTrack = n; prefs.audio = String(hls.audioTracks[n].lang || hls.audioTracks[n].name); }});
      }
      if (hls && hls.subtitleTracks && hls.subtitleTracks.length) {
        rows.push({label:'Sottotitoli', options:['Disattivati'].concat(hls.subtitleTracks.map(function (t) { return t.name || t.lang || 'Sottotitoli'; })),
          current:hls.subtitleTrack + 1, apply:function (n) {
            if (n === 0) { hls.subtitleTrack = -1; prefs.subs = 'off'; }
            else { hls.subtitleDisplay = true; hls.subtitleTrack = n - 1; prefs.subs = trackKey(hls.subtitleTracks[n - 1]); }
          }});
      }
      rows.push({label:'Velocità', options:SPEEDS.map(function (s) { return s === 1 ? 'Normale' : String(s).replace('.', ',') + '×'; }),
        current:Math.max(0, SPEEDS.indexOf(video.playbackRate)), apply:function (n) { prefs.speed = SPEEDS[n]; applySpeed(); }});
      if (servers.length > 1) {
        rows.push({label:'Server', options:servers.map(function (s) { return s.name; }), current:serverIndex,
          apply:function (n) { serverIndex = n; restart(); }});
      }
      if (video.currentTime > 30) {
        rows.push({label:'Ricomincia', options:['Premi OK per tornare all\'inizio'], current:0, action:function () {
          try { video.currentTime = 0; } catch (e) {}
          closePanel();
        }});
      }
      rows.push({label:'Lettore', options:['Avanzato', 'TV (base)'], current:player.engine === 'native' ? 1 : 0, apply:function (n) {
        prefs.engine = n === 1 ? 'native' : 'hls'; player.fellBack = false; startEngine(video.currentTime);
      }});
      return rows;
    }
    var currentRows = [];
    function renderPanel() {
      currentRows = settingRows();
      if (selectedRow >= currentRows.length) selectedRow = currentRows.length - 1;
      var html = '<h2>Impostazioni<small>SC TV ' + VERSION + '</small></h2>';
      currentRows.forEach(function (row, i) {
        html += '<div class="sc-tv-setting' + (i === selectedRow ? ' sc-tv-selected' : '') + '"><b>' + row.label + '</b><span>‹ ' +
          String(row.options[row.current] || '').replace(/[&<>]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }) + ' ›</span></div>';
      });
      var hint = player.engine === 'native' ? 'Con il lettore TV (base) qualità, audio e sottotitoli non sono selezionabili.' :
        (player.engine === 'hls' ? '' : 'Caricamento del lettore…');
      html += '<p>' + (hint ? hint + '<br>' : '') + '▲ ▼ scegli · ◀ ▶ o OK cambia · Indietro chiude</p>';
      panel.innerHTML = html;
    }
    function change(step) {
      var row = currentRows[selectedRow]; if (!row) return;
      if (row.action) { if (step === 1) row.action(); return; }
      var next = (row.current + step + row.options.length) % row.options.length;
      try { row.apply(next); } catch (e) {}
      savePlayerPrefs(prefs);
      renderPanel();
    }
    function openPanel() { selectedRow = 0; renderPanel(); panel.hidden = false; showBar(); }
    function closePanel() { panel.hidden = true; showBar(); }
    player.openPanel = openPanel;
    var pendingResume = 0;
    function applyResume() {
      if (!(pendingResume > 0) || video.readyState < 1) return;
      var at = pendingResume; pendingResume = 0;
      if (video.currentTime > 15) return;
      try { video.currentTime = at; } catch (e) {}
      player.notice = 'Ripreso da ' + clock(at) + ' · ricomincia dalle impostazioni';
      showBar();
    }
    video.addEventListener('loadedmetadata', applyResume);
    player.resume = function (position) {
      if (!(position > 0)) return;
      pendingResume = position;
      applyResume();
    };
    player.handleKey = function (code, repeat) {
      if (!panel.hidden) {
        if (code === 38) { selectedRow = Math.max(0, selectedRow - 1); renderPanel(); }
        else if (code === 40) { selectedRow = Math.min(currentRows.length - 1, selectedRow + 1); renderPanel(); }
        else if (code === 37) change(-1);
        else if (code === 39 || code === 13) { if (!repeat || (code === 39 && !(currentRows[selectedRow] || {}).action)) change(1); }
        else if (code === 27 || code === 10009 || code === 457) { if (!repeat) closePanel(); }
        else return false;
        return true;
      }
      if (code === 38 || code === 40 || code === 457) { if (!repeat) openPanel(); return true; }
      showBar();
      return false;
    };
    player.panelOpen = function () { return !panel.hidden; };

    document.body.appendChild(video);
    document.body.appendChild(bar);
    document.body.appendChild(panel);
    startEngine(Number(queryValue('minute')) * 60 || 0);
    showBar();
    try { video.focus(); } catch (e) {}
    return player;
  }

  // TizenBrew attaches to the TV browser with Debugger.enable(). The embed page
  // runs an anti-devtools loop (`debugger` every 111 ms): with a debugger
  // attached it pauses the whole renderer forever and only the CSS spinner
  // keeps turning. TizenBrew evaluates this module when the frame context is
  // created, before the parser reaches that inline script, so it can be
  // detached from the document before it runs.
  function disarmDebuggerTrap() {
    function neutralise(node) {
      if (!node || node.tagName !== 'SCRIPT' || node.src || node.type === 'javascript/blocked' || !/\bdebugger\b/.test(node.textContent || '')) return;
      node.type = 'javascript/blocked';
      if (node.parentNode) node.parentNode.removeChild(node);
      window.__scTVFrame.disarmed = (window.__scTVFrame.disarmed || 0) + 1;
    }
    if (!window.MutationObserver) return;
    var observer = new window.MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        for (var j = 0; j < records[i].addedNodes.length; j++) {
          var added = records[i].addedNodes[j];
          if (added.nodeType === 1) neutralise(added);
          else if (added.nodeType === 3) neutralise(added.parentNode);
        }
      }
    });
    observer.observe(document, {childList:true, subtree:true});
    window.addEventListener('load', function () { observer.disconnect(); });
  }

  function observePlayerFrame() {
    if (window.__scTVFrame) return;
    window.__scTVFrame = {version:VERSION};
    disarmDebuggerTrap();
    var nativeVideo = null, nativePlayer = null;
    window.__scTVFrame.engine = 'site';
    function startNative() {
      nativePlayer = mountNativePlayer();
      if (nativePlayer) { nativeVideo = nativePlayer.video; window.__scTVFrame.engine = 'native-hls'; report(true); }
    }
    var video = null, scriptErrors = 0, blocked = false, lastReport = 0;
    var scriptErrorKind = '', missingFeature = '';
    var destination = homeLink.protocol + '//' + homeLink.host;
    var started = Date.now(), poll;
    function report(force) {
      var now = Date.now();
      if (!force && now - lastReport < 1000) return;
      lastReport = now;
      var found = nativeVideo || document.querySelector('video');
      if (found !== video) {
        video = found;
        if (video) {
          ['loadedmetadata','canplay','playing','waiting','stalled','pause','error','timeupdate'].forEach(function (name) {
            video.addEventListener(name, function () { if (name === 'playing') blocked = false; report(name === 'error'); });
          });
        }
      }
      var error = video && video.error ? Number(video.error.code) : 0;
      var stage = !video ? 'no-video' : (error ? 'media-error' : (blocked ? 'play-blocked' :
        (!video.paused && video.currentTime > 0 ? 'playing' : (video.readyState >= 2 ? 'ready' : 'loading'))));
      window.top.postMessage({type:'sctv-player-state', version:VERSION, stage:stage, error:error,
        readyState:video ? Number(video.readyState) : 0, networkState:video ? Number(video.networkState) : 0,
        position:video && isFinite(video.currentTime) ? Math.floor(video.currentTime) : 0,
        duration:video && isFinite(video.duration) ? Math.floor(video.duration) : 0,
        scriptErrors:scriptErrors, scriptErrorKind:scriptErrorKind, missingFeature:missingFeature, engine:nativePlayer ? (nativePlayer.engine === 'hls' ? 'hlsjs' : 'native-hls') : 'site',
        modulesSupported:'noModule' in document.createElement('script'),
        moduleScripts:document.querySelectorAll('script[type="module"]').length}, destination);
      if (poll && now - started > 120000) window.clearInterval(poll);
    }
    window.addEventListener('error', function (event) {
      if ((event.target && event.target.tagName === 'SCRIPT') || event.message) {
        scriptErrors++;
        var kind = event.error && event.error.name;
        scriptErrorKind = ['SyntaxError','ReferenceError','TypeError','RangeError'].indexOf(kind) !== -1 ? kind :
          (event.target && event.target.tagName === 'SCRIPT' ? 'ResourceError' : 'Error');
        missingFeature = '';
        var match = String(event.message || '').match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?) is not (?:defined|a function|a constructor)/);
        if (match) missingFeature = knownPlayerFeature(match[1]);
        report(true);
      }
    }, true);
    window.addEventListener('keydown', function (event) {
      var code = event.keyCode || {Enter:13,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Escape:27,BrowserBack:10009,Info:457,ColorF3Blue:406}[event.key];
      if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
      if (nativePlayer && !nativeVideo.error && nativePlayer.handleKey(code, event.repeat)) {
        event.preventDefault(); event.stopImmediatePropagation(); report(true); return;
      }
      if (code === 457 || code === 406) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!event.repeat) window.top.postMessage({type:'sctv-player-action',action:code === 457 ? 'diagnostics' : 'home'},destination);
        return;
      }
      var active = document.activeElement;
      if (active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable)) return;
      if (nativeVideo && !nativeVideo.error && (code === 37 || code === 39)) code = code === 39 ? 417 : 412;
      if ([27,10009].indexOf(code) !== -1 && (document.fullscreenElement || document.webkitFullscreenElement)) {
        var leaveFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        if (leaveFullscreen) {
          event.preventDefault(); event.stopImmediatePropagation();
          var leaving = leaveFullscreen.call(document);
          if (leaving && leaving.catch) leaving.catch(function () {});
          return;
        }
      }
      if (active && (/^(BUTTON|A)$/.test(active.tagName) || active.getAttribute('role') === 'button') && [27,10009].indexOf(code) === -1) return;
      if ([27,10009].indexOf(code) !== -1 || ((!video || video.error) && [13,37,38,39,40].indexOf(code) !== -1)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!event.repeat || (code >= 37 && code <= 40)) window.top.postMessage({type:'sctv-player-action',action:'navigate',key:code},destination);
        report(true); return;
      }
      if (!video) { report(true); return; }
      if ([13,415,19,413,10252,417,412].indexOf(code) === -1) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.repeat && (code === 13 || code === 10252)) return;
      try {
        if (code === 415 || ((code === 13 || code === 10252) && video.paused)) {
          blocked = false;
          var playing = video.play();
          if (playing && playing.catch) playing.catch(function () { blocked = true; report(true); });
        } else if (code === 19 || code === 413 || code === 13 || code === 10252) video.pause();
        else {
          var start = video.seekable.length ? video.seekable.start(0) : 0;
          var end = video.seekable.length ? video.seekable.end(video.seekable.length - 1) : video.duration;
          if (isFinite(end)) video.currentTime = Math.max(start,Math.min(end,video.currentTime + (code === 417 ? 10 : -10)));
        }
        report(true);
      } catch (e) { report(true); }
    }, true);
    window.addEventListener('message', function (event) {
      if (event.origin !== destination || event.source !== window.top || !event.data || event.data.type !== 'sctv-resume') return;
      var position = Number(event.data.position);
      if (nativePlayer && isFinite(position) && position > 0 && position < 86400) nativePlayer.resume(position);
    });
    // Injected when the frame context is created: wait for the page data and
    // for the site's player script to have run (or failed to parse).
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startNative);
    else startNative();
    report(true);
    poll = window.setInterval(function () { report(false); },2000);
    window.addEventListener('pagehide',function () { window.clearInterval(poll); });
  }

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
  // Watch history, kept on this TV only (localStorage of the site origin).
  // titles: most recent first; episodes: per-episode position for series.
  var HISTORY_KEY = 'sctv-history';
  function readHistory() {
    var h = readStore(window.localStorage, HISTORY_KEY, null);
    if (!h || typeof h !== 'object' || !Array.isArray(h.titles) || !h.episodes || typeof h.episodes !== 'object') h = {titles:[], episodes:{}};
    h.titles = h.titles.filter(valid);
    return h;
  }
  function saveHistory(h) {
    h.titles = h.titles.slice(0, 40);
    var keys = Object.keys(h.episodes);
    if (keys.length > 600) {
      keys.sort(function (a, b) { return (h.episodes[b].u || 0) - (h.episodes[a].u || 0); });
      keys.slice(600).forEach(function (k) { delete h.episodes[k]; });
    }
    saveStore(window.localStorage, HISTORY_KEY, h);
  }
  function historyEntry(h, id) {
    for (var i = 0; i < h.titles.length; i++) if (Number(h.titles[i].id) === Number(id)) return h.titles[i];
    return null;
  }
  function finished(position, duration) { return duration > 0 && duration - position <= Math.max(90, duration * 0.04); }
  function shortEpisode(e) {
    return e ? {id:Number(e.id), number:e.number, name:String(e.name || ''), season:e.season || null} : null;
  }
  // Moves a title to the front of the history, merging the catalogue metadata.
  function touchHistory(h, title, episode) {
    var entry = historyEntry(h, title.id) || {id:Number(title.id)};
    h.titles = h.titles.filter(function (t) { return Number(t.id) !== Number(title.id); });
    entry.slug = title.slug || entry.slug || '';
    entry.name = title.name || entry.name || 'Titolo';
    entry.type = title.type || entry.type || '';
    if (title.images && title.images.length) entry.images = title.images.slice(0, 6);
    if (episode) {
      var short = shortEpisode(episode);
      if (!short.season && entry.episode && Number(entry.episode.id) === short.id) short.season = entry.episode.season;
      entry.episode = short;
    }
    entry.updated = Date.now();
    h.titles.unshift(entry);
    return entry;
  }
  function episodeProgress(h, id) { return h.episodes[String(id)] || null; }
  // The point to resume a title from, and what the continue row shows.
  function continueTarget(entry, h) {
    if (entry.type === 'tv' && entry.episode) {
      var ep = episodeProgress(h, entry.episode.id);
      if (ep && !ep.done && ep.p > 30) return {episode:entry.episode, p:ep.p, d:ep.d};
      if (ep && ep.done && entry.next) return {episode:entry.next, p:0, d:0, next:true};
      return null;
    }
    if (entry.type !== 'tv' && !entry.done && entry.p > 30) return {p:entry.p, d:entry.d};
    return null;
  }
  function episodeLabel(e) {
    return (e.season ? 'S' + e.season + ' · ' : '') + 'Episodio ' + e.number;
  }
  function remaining(p, d) {
    if (!(d > 0)) return clock(p);
    var minutes = Math.max(1, Math.round((d - p) / 60));
    return minutes + ' min rimasti';
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
    var h = readHistory();
    var loaded = state.kind === 'detail' && state.page && state.page.props.loadedSeason;
    var season = episode && (episode.season || (loaded && (loaded.episodes || []).some(function (e) { return Number(e.id) === Number(episode.id); }) ? loaded.number : null));
    touchHistory(h, title, episode ? {id:episode.id, number:episode.number, name:episode.name, season:season} : null);
    saveHistory(h);
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
      heroPlayHTML(title) +
      '<button class="sc-action" data-hero="' + (details ? 'list' : 'details') + '">' +
      (details ? (inList(title.id) ? '✓ Nella mia lista' : '+ La mia lista') : 'ⓘ &nbsp;Dettagli') + '</button>' +
      '</div></div></section>';
  }
  function heroPlayHTML(title) {
    var h = readHistory(), entry = historyEntry(h, title.id), target = entry && continueTarget(entry, h);
    if (target && target.episode) {
      return '<a class="sc-action sc-primary" data-hero="play" href="' + esc(watchURL(title, target.episode)) + '">▶ &nbsp;' +
        (target.next ? 'Prossimo: ' : 'Riprendi ') + esc(episodeLabel(target.episode)) + '</a>';
    }
    if (target) return '<a class="sc-action sc-primary" data-hero="play" href="' + esc(watchURL(title)) + '">▶ &nbsp;Riprendi da ' + esc(clock(target.p)) + '</a>';
    return '<a class="sc-action sc-primary" data-hero="play" href="' + esc(watchURL(title)) + '">▶ &nbsp;Guarda</a>';
  }
  function wireHero(title, details) {
    var row = addRow();
    wire(root.querySelector('[data-hero="play"]'), row, 'hero-play', function () {
      var h = readHistory(), entry = historyEntry(h, title.id), target = entry && continueTarget(entry, h);
      play(title, target && target.episode);
    });
    var action = details ? 'list' : 'details';
    wire(root.querySelector('[data-hero="' + action + '"]'), row, details ? 'detail-list' : 'hero-details', function () {
      if (details) toggleList(title); else openTitle(title);
    });
  }
  function cardHTML(title, key, rank, resume) {
    var art = picture(title, ['cover', 'cover_mobile', 'background', 'poster']);
    var progress = resume && resume.progress > 0 ? Math.max(2, Math.min(100, Math.round(resume.progress * 100))) : 0;
    return '<button class="sc-card" data-card="' + esc(key) + '" aria-label="' + esc(title.name) + '">' +
      '<div class="sc-card-art">' + (art ? '<img src="' + esc(art) + '" alt="" loading="lazy">' : '') +
      (rank ? '<span data-rank="' + rank + '">' + rank + '</span>' : '') +
      (progress ? '<i class="sc-progress"><i style="width:' + progress + '%"></i></i>' : '') + '</div>' +
      '<span class="sc-card-title">' + esc(title.name) + '</span><span class="sc-card-meta">' +
      (resume ? esc(resume.sub) : (title.type === 'tv' ? 'Serie TV' : 'Film') + (title.score ? ' · ' + esc(title.score) + ' / 10' : '')) + '</span></button>';
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
    var h = readHistory();
    state.continueItems = [];
    h.titles.forEach(function (entry) {
      var target = continueTarget(entry, h);
      if (target && (filter === 'all' || entry.type === filter) && state.continueItems.length < 20) state.continueItems.push({title:normalise(entry), target:target});
    });
    if (state.continueItems.length) {
      html += '<section class="sc-row"><h2>Continua a guardare</h2><div class="sc-track">';
      state.continueItems.forEach(function (item, i) {
        var t = item.target, sub = t.episode ? (t.next ? 'Prossimo: ' : '') + episodeLabel(t.episode) + (t.next ? '' : ' · ' + remaining(t.p, t.d)) : remaining(t.p, t.d);
        html += cardHTML(item.title, 'continue-' + i, 0, {sub:sub, progress:t.d > 0 ? t.p / t.d : 0});
      });
      html += '</div></section>';
    }
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
      var history = readHistory();
      (loaded.episodes || []).forEach(function (e, i) {
        var seen = episodeProgress(history, e.id);
        var status = seen && seen.done ? '✓ Visto' : (seen && seen.p > 30 ? remaining(seen.p, seen.d) : (e.duration ? esc(e.duration) + ' min' : '▶'));
        var bar = seen && seen.d > 0 ? '<i class="sc-progress"><i style="width:' + (seen.done ? 100 : Math.max(2, Math.round(seen.p / seen.d * 100))) + '%"></i></i>' : '';
        html += '<a class="sc-episode' + (seen && seen.done ? ' sc-watched' : '') + '" data-episode="' + i + '" href="' + esc(watchURL(title, e)) + '"><span class="sc-episode-number">' + esc(e.number) + '</span>' +
          '<span class="sc-episode-copy">' + esc(e.name || ('Episodio ' + e.number)) + '<span>' + esc(e.plot || '') + '</span>' + bar + '</span>' +
          '<span class="sc-episode-status">' + status + '</span></a>';
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
      if (state.continueItems.length) {
        var continueRow = addRow();
        state.continueItems.forEach(function (item, i) {
          wire(root.querySelector('[data-card="continue-' + i + '"]'), continueRow, 'continue-' + i, function () {
            play(item.title, item.target.episode);
            window.location.assign(watchURL(item.title, item.target.episode));
          });
        });
      }
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
      '<button class="sc-action" data-help="update">Aggiorna</button><button class="sc-action" data-help="exit">Esci</button></div></section>';
    root.appendChild(overlay); modalOpen = true;
    rows = []; var row = addRow();
    wire(overlay.querySelector('[data-help="close"]'), row, 'help-close', closeHelp);
    wire(overlay.querySelector('[data-help="original"]'), row, 'help-original', function () {
      ++requestId; if (activeRequest) activeRequest.abort();
      root.remove(); style.remove(); document.documentElement.classList.remove('sc-tv-active');
      window.removeEventListener('keydown', onKey, true);
      window.__scTV.mode = 'original';
    });
    wire(overlay.querySelector('[data-help="update"]'), row, 'help-update', function () { window.location.assign(AUTO_URL); });
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
    var togglePlayerDiagnostics = null;
    var handlePlayerKey = null;
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
              '#sc-tv-player-diagnostics{position:absolute;left:8%;right:8%;top:17%;max-height:70%;overflow:auto;padding:30px;color:white;background:#141b29;border:2px solid #75819a;border-radius:12px;font:25px/1.6 Arial,sans-serif;white-space:pre-wrap;z-index:3;}' +
              '#sc-tv-player [hidden]{display:none!important;}' +
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
            // Back leaves the player: return to the page that opened it (the
            // title page, restored by the catalogue), or to the home page.
            var leaving = false;
            var leavePlayer = function () {
              if (leaving) return;
              leaving = true; window.__scTV.player.leaving = true;
              var cameFromSite = false;
              try { var previous = document.createElement('a'); previous.href = document.referrer; cameFromSite = previous.host === homeLink.host; } catch (e) {}
              if (cameFromSite && window.history.length > 1) {
                window.history.back();
                window.setTimeout(function () { window.location.assign(origin + '/' + locale); }, 1500);
              } else window.location.assign(origin + '/' + locale);
            };
            window.__scTV.player.leave = leavePlayer;
            var diagnosticPanel = document.createElement('div');
            diagnosticPanel.id = 'sc-tv-player-diagnostics'; diagnosticPanel.hidden = true;
            diagnosticPanel.setAttribute('role','dialog'); diagnosticPanel.setAttribute('aria-label','Diagnostica lettore');
            var lastState = null, noVideoSince = null, automaticallyOpened = false, playerWatchdog = null, openedByRecovery = false;
            var stageLabels = { 'no-video':'Il lettore esterno non ha ancora creato un video.',
              'loading':'Video creato: attesa dei dati del film.', 'ready':'Dati video pronti: premi OK o Play nel lettore.',
              'playing':'Il lettore segnala una riproduzione in corso.', 'play-blocked':'Avvio non riuscito: premi OK o Play direttamente nel lettore.',
              'media-error':'Il video ha segnalato un errore.' };
            var errorLabels = {1:'Riproduzione interrotta',2:'Errore di rete',3:'Errore di decodifica',4:'Sorgente o formato non supportato'};
            function focusEmbeddedPlayer() {
              if (!diagnosticPanel.hidden) return;
              try {
                var child = frame.contentDocument && frame.contentDocument.querySelector('iframe');
                if (child) { child.focus(); return; }
              } catch (e) {}
              frame.focus();
            }
            function renderDiagnostics() {
              var lines = ['SC TV ' + VERSION + ' — stato del lettore'];
              if (window.__scTV.player.diagnosticsReason === 'local-timeout') lines.push('Apertura di emergenza: riproduzione non confermata entro 25 secondi.');
              if (!lastState) lines.push('Nessun dato ricevuto dal lettore esterno. Questo non identifica ancora la causa del blocco.');
              else {
                lines.push(stageLabels[lastState.stage]);
                lines.push('Lettore: ' + (lastState.engine === 'hlsjs' ? 'SC TV avanzato (hls.js)' : (lastState.engine === 'native-hls' ? 'video nativo della TV' : 'lettore del sito')));
                lines.push('Stato dati video: ' + lastState.readyState + ' / 4; stato rete: ' + lastState.networkState + ' / 3');
                lines.push('Errore video: ' + (errorLabels[lastState.error] || 'nessuno segnalato'));
                lines.push('Errori script rilevati: ' + lastState.scriptErrors);
                if (lastState.scriptErrorKind) lines.push('Ultimo errore script: ' + lastState.scriptErrorKind +
                  (lastState.missingFeature ? ' · ' + lastState.missingFeature : ''));
                lines.push('Script a moduli supportati: ' + (lastState.modulesSupported ? 'sì' : 'no') + '; presenti nel lettore: ' + lastState.moduleScripts);
              }
              lines.push('OK, Info o Return chiude questa schermata. Blu torna al catalogo.');
              lines.push('Questo controllo non certifica immagine e audio sulla TV.');
              diagnosticPanel.textContent = lines.join('\n');
            }
            togglePlayerDiagnostics = function () {
              renderDiagnostics(); diagnosticPanel.hidden = !diagnosticPanel.hidden;
              if (diagnosticPanel.hidden) focusEmbeddedPlayer();
              else {
                automaticallyOpened = true;
                window.clearTimeout(playerWatchdog);
                try { frame.blur(); document.body.focus(); } catch (e) {}
              }
            };
            handlePlayerKey = function (code) {
              if (!diagnosticPanel.hidden) {
                if (code === 13 || code === 27 || code === 10009) togglePlayerDiagnostics();
                else if (code === 38) diagnosticPanel.scrollTop -= 100;
                else if (code === 40) diagnosticPanel.scrollTop += 100;
                return;
              }
              if (code === 27 || code === 10009) { leavePlayer(); return; }
              focusEmbeddedPlayer();
            };
            playerRoot.appendChild(diagnosticPanel);
            frame.onload = function () { focusEmbeddedPlayer(); };
            // Watch history: what is playing, where to resume it, and saving progress.
            var watching = valid(page.props.title) ? normalise(page.props.title) : null;
            var watchingEpisode = watching && watching.type === 'tv' && page.props.episode && valid(page.props.episode) ? page.props.episode : null;
            var nextEpisode = page.props.nextEpisode && valid(page.props.nextEpisode) ? shortEpisode(page.props.nextEpisode) : null;
            var resumeSent = false, lastSaved = -1, lastProgress = null;
            function resumePosition() {
              if (!watching) return 0;
              var h = readHistory(), entry = historyEntry(h, watching.id);
              if (watchingEpisode) {
                var ep = episodeProgress(h, watchingEpisode.id);
                return ep && !ep.done && ep.p > 30 ? ep.p : 0;
              }
              return entry && !entry.done && entry.p > 30 ? entry.p : 0;
            }
            function saveProgress(position, duration) {
              if (!watching || !(position > 0)) return;
              var h = readHistory();
              var entry = touchHistory(h, watching, watchingEpisode);
              var done = finished(position, duration);
              if (watchingEpisode) {
                h.episodes[String(watchingEpisode.id)] = {p:position, d:duration, u:Date.now(), done:done};
                if (nextEpisode) {
                  if (nextEpisode.season === null && entry.episode) nextEpisode.season = entry.episode.season;
                  entry.next = nextEpisode;
                } else delete entry.next;
              } else { entry.p = position; entry.d = duration; entry.done = done; }
              saveHistory(h);
              lastSaved = position;
            }
            window.__scTV.player.saveProgress = saveProgress;
            window.addEventListener('message',function (event) {
              if (event.origin !== 'https://vixcloud.cc' || !event.data || typeof event.data !== 'object') return;
              var recognised = false;
              try {
                var children = frame.contentWindow.frames;
                for (var i = 0; i < children.length; i++) if (event.source === children[i]) recognised = true;
              } catch (e) {}
              if (!recognised) return;
              var data = event.data;
              if (data.type === 'sctv-player-action') {
                if (data.action === 'diagnostics') togglePlayerDiagnostics();
                if (data.action === 'home') window.location.assign(origin + '/' + locale);
                if (data.action === 'navigate' && [13,27,37,38,39,40,10009].indexOf(data.key) !== -1) handlePlayerKey(data.key);
                return;
              }
              if (data.type !== 'sctv-player-state' || !Object.prototype.hasOwnProperty.call(stageLabels,data.stage)) return;
              function bounded(value,max) { var number = Number(value); return isFinite(number) ? Math.max(0,Math.min(max,Math.floor(number))) : 0; }
              lastState = {stage:data.stage,error:bounded(data.error,4),readyState:bounded(data.readyState,4),networkState:bounded(data.networkState,3),
                scriptErrors:bounded(data.scriptErrors,999),moduleScripts:bounded(data.moduleScripts,999),modulesSupported:data.modulesSupported === true,
                scriptErrorKind:['SyntaxError','ReferenceError','TypeError','RangeError','ResourceError','Error'].indexOf(data.scriptErrorKind) === -1 ? '' : data.scriptErrorKind,
                missingFeature:knownPlayerFeature(data.missingFeature), engine:['hlsjs','native-hls'].indexOf(data.engine) === -1 ? 'site' : data.engine};
              window.__scTV.player.lastState = lastState;
              if (!resumeSent) {
                resumeSent = true;
                var resumeAt = resumePosition();
                if (resumeAt > 0) {
                  try { event.source.postMessage({type:'sctv-resume', position:resumeAt}, 'https://vixcloud.cc'); } catch (e) {}
                }
              }
              var position = bounded(data.position, 86400), duration = bounded(data.duration, 86400);
              if (position > 0) {
                lastProgress = {p:position, d:duration};
                if (Math.abs(position - lastSaved) >= 5 || finished(position, duration)) saveProgress(position, duration);
              }
              if (lastState.stage === 'playing') {
                window.clearTimeout(playerWatchdog);
                // Playback started after an automatic recovery opening: get out of the way.
                if (openedByRecovery && !diagnosticPanel.hidden) togglePlayerDiagnostics();
                openedByRecovery = false;
              }
              renderDiagnostics();
              if (lastState.stage === 'no-video') {
                if (noVideoSince === null) noVideoSince = Date.now();
                if (!automaticallyOpened && Date.now() - noVideoSince >= 8000) {
                  automaticallyOpened = true;
                  if (diagnosticPanel.hidden) { togglePlayerDiagnostics(); openedByRecovery = true; }
                }
              } else noVideoSince = null;
            });
            document.body.appendChild(playerRoot);
            document.documentElement.classList.add('sc-tv-player-active');
            window.__scTV.player.iframeMounted = true;
            // This timer deliberately does not depend on callbacks from the external
            // player. A blocked or silent frame must not hide the recovery controls.
            playerWatchdog = window.setTimeout(function () {
              if (automaticallyOpened || (lastState && lastState.stage === 'playing')) return;
              window.__scTV.player.diagnosticsReason = 'local-timeout';
              if (document.fullscreenElement || document.webkitFullscreenElement) {
                var leaveFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
                if (leaveFullscreen) {
                  try {
                    var leaving = leaveFullscreen.call(document);
                    if (leaving && leaving.catch) leaving.catch(function () {});
                  } catch (e) {}
                }
              }
              if (diagnosticPanel.hidden) { togglePlayerDiagnostics(); openedByRecovery = true; }
              else renderDiagnostics();
            },25000);
            window.addEventListener('pagehide',function () {
              window.clearTimeout(playerWatchdog);
              if (lastProgress && lastProgress.p !== lastSaved) saveProgress(lastProgress.p, lastProgress.d);
            });
          } else window.__scTV.player.reason = 'unexpected-embed-address';
        }
      }
    }
    window.addEventListener('keydown', function (e) {
      var code = e.keyCode || {Enter:13,Escape:27,BrowserBack:10009,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Info:457,ColorF3Blue:406}[e.key];
      if (handlePlayerKey && [13,27,37,38,39,40,10009].indexOf(code) !== -1) {
        consume(e);
        if (!e.repeat || (code >= 37 && code <= 40)) handlePlayerKey(code);
        return;
      }
      if (code === 457 && togglePlayerDiagnostics) { consume(e); if (!e.repeat) togglePlayerDiagnostics(); }
      if ((code === 27 || code === 10009) && togglePlayerDiagnostics) {
        var panel = document.getElementById('sc-tv-player-diagnostics');
        if (panel && !panel.hidden) { consume(e); if (!e.repeat) togglePlayerDiagnostics(); }
      }
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
