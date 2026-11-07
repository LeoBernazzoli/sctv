/* Stable TizenBrew launcher. Keep this small entry point compatible with Chrome 47. */
(function () {
  'use strict';
  if (window.top !== window.self || location.hostname !== '127.0.0.1' ||
      location.pathname.indexOf('/module/') !== 0 || !/\/launcher\/index\.html$/.test(location.pathname)) return;
  if (window.__scAutoLoader) return;
  window.__scAutoLoader = {state:'starting',version:null};
  var UPDATE_URL = 'https://raw.githubusercontent.com/LeoBernazzoli/sctv/main/update.json';
  var FALLBACK = {schema:1,version:'0.3.0',tag:'v0.3.0'};
  var STORE = 'sctv.auto.last';
  var attempt = 0, activeXHR, activeSocket, socketTimeout;
  var status, detail, retry, launchLink;

  function valid(value) {
    return value && value.schema === 1 && /^\d+\.\d+\.\d+$/.test(value.version) && value.tag === 'v' + value.version;
  }
  function readLast() {
    try { var value = JSON.parse(window.localStorage.getItem(STORE)); if (valid(value)) return value; } catch (e) {}
    return FALLBACK;
  }
  function saveLast(value) {
    try { window.localStorage.setItem(STORE,JSON.stringify(value)); } catch (e) {}
  }
  function message(state,text,more) {
    window.__scAutoLoader.state = state;
    status.textContent = text;
    detail.textContent = more || '';
  }
  function fail(token,text) {
    if (token !== attempt || window.__scAutoLoader.state === 'launched') return;
    window.clearTimeout(socketTimeout);
    message('error',text,'Chiudi completamente e riapri TizenBrew, oppure premi Riprova.');
    retry.hidden = false; retry.focus();
  }
  function moduleFor(release) {
    var name = 'leobernazzoli/sctv@' + release.tag;
    return {fullName:'gh/' + name,name:name,moduleType:'gh',packageType:'mods',appName:'SC TV',version:release.version,
      appPath:'https://streamingcommunityz.boo/en',mainFile:'src/tv.js',evaluateScriptOnDocumentStart:false,
      keys:['Info','ColorF3Blue','MediaPlayPause','MediaPlay','MediaPause','MediaStop','MediaFastForward','MediaRewind']};
  }
  function activate(token,release,fallback) {
    if (token !== attempt) return;
    window.__scAutoLoader.version = release.version;
    message('connecting','Avvio di SC TV ' + release.version,
      fallback ? 'Controllo aggiornamenti non riuscito: uso la versione disponibile.' : 'Versione disponibile trovata. Non serve cambiare il modulo.');
    var module = moduleFor(release);
    var socket;
    try { socket = new WebSocket('ws://127.0.0.1:8081'); } catch (e) { fail(token,'Non riesco a comunicare con TizenBrew.'); return; }
    activeSocket = socket;
    socketTimeout = window.setTimeout(function () { fail(token,'TizenBrew non ha confermato l’avvio.'); try {socket.close();}catch(e){} },5000);
    socket.onopen = function () {
      if (token !== attempt || window.__scAutoLoader.state !== 'connecting') { socket.close(); return; }
      try {
        if (window.tizen && window.tizen.tvinputdevice) module.keys.forEach(function (key) {
          try { window.tizen.tvinputdevice.registerKey(key); } catch (e) {}
        });
        // Use TizenBrew's own module handoff. No downloaded JS is evaluated here.
        socket.send(JSON.stringify({type:-1,payload:null}));
        socket.send(JSON.stringify({type:5,payload:module}));
        // Ordered WebSocket messages: this reply confirms the handoff was processed.
        socket.send(JSON.stringify({type:1,payload:null}));
      } catch (e) { fail(token,'Comunicazione con TizenBrew interrotta.'); }
    };
    socket.onmessage = function (event) {
      if (token !== attempt || window.__scAutoLoader.state !== 'connecting') return;
      var data;
      try { data = JSON.parse(event.data); } catch (e) { return; }
      if (data.type === 8) { fail(token,'TizenBrew ha rifiutato l’avvio.'); socket.close(); return; }
      if (data.type !== 1) return;
      var debug = data.payload || {};
      if (!debug.tizenDebug && !debug.webDebug && !debug.rwiDebug && !debug.appDebug) {
        fail(token,'La sessione di avvio di TizenBrew non è pronta.'); socket.close(); return;
      }
      window.clearTimeout(socketTimeout);
      saveLast(release);
      message('launched','SC TV ' + release.version,'Apertura del catalogo…');
      launchLink.href = module.appPath;
      socket.close();
      launchLink.click();
    };
    socket.onerror = function () { fail(token,'Non riesco a collegarmi al servizio di TizenBrew.'); };
    socket.onclose = function () {
      if (token === attempt && window.__scAutoLoader.state === 'connecting') fail(token,'Il collegamento a TizenBrew si è chiuso prima della conferma.');
    };
  }
  function start() {
    var token = ++attempt;
    if (activeXHR) { try { activeXHR.abort(); } catch (e) {} }
    if (activeSocket) { try { activeSocket.close(); } catch (e) {} }
    window.clearTimeout(socketTimeout);
    retry.hidden = true;
    message('checking','Controllo aggiornamenti…','SC TV Auto cerca la versione più recente a ogni apertura.');
    var xhr = new XMLHttpRequest(), settled = false;
    activeXHR = xhr;
    function finish(release,fallback) {
      if (settled || token !== attempt) return;
      settled = true;
      activate(token,release,fallback);
    }
    try {
      xhr.open('GET',UPDATE_URL + '?check=' + Date.now() + '-' + Math.random().toString(36).slice(2),true);
      xhr.timeout = 6000;
      xhr.onload = function () {
        var release;
        try { if (xhr.status === 200) release = JSON.parse(xhr.responseText); } catch (e) {}
        if (valid(release)) finish({schema:1,version:release.version,tag:release.tag},false);
        else finish(readLast(),true);
      };
      xhr.onerror = xhr.ontimeout = function () { finish(readLast(),true); };
      xhr.send();
    } catch (e) { finish(readLast(),true); }
  }
  function init() {
    status = document.getElementById('status'); detail = document.getElementById('detail');
    retry = document.getElementById('retry'); launchLink = document.getElementById('launch');
    if (!status || !detail || !retry || !launchLink) return;
    retry.onclick = start;
    window.addEventListener('keydown',function (event) {
      if ((event.keyCode === 13 || event.key === 'Enter') && !retry.hidden) {
        event.preventDefault(); if (!event.repeat) retry.click();
      }
    });
    start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}());
