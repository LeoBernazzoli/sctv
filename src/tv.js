/* StreamingCommunity TV — injected by TizenBrew, no build required. */
(function () {
  'use strict';

  var HOME_URL = 'https://streamingcommunityz.boo/en';
  var home = document.createElement('a');
  home.href = HOME_URL;
  // TizenBrew also injects into frames and other execution contexts.
  if (location.hostname !== home.hostname || window.top !== window.self) return;
  if (window.__scTV) return;
  window.__scTV = { version: '0.1.0' };

  var selector = 'a[href],button,input:not([type="hidden"]),textarea,select,' +
    '[role="button"],[role="link"],[role="tab"],[tabindex],[contenteditable="true"],iframe,video[controls]';
  var current = null;
  var previous = null;
  var panel;
  var badge;
  var badgeTimer;
  var refreshTimer;

  function visible(el) {
    if (!el || !document.documentElement.contains(el)) return false;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    for (var p = el; p && p.nodeType === 1; p = p.parentElement) {
      if (p.hidden || p.inert || p.getAttribute('aria-hidden') === 'true') return false;
      var css = window.getComputedStyle(p);
      if (css.display === 'none' || css.visibility === 'hidden' || css.opacity === '0') return false;
    }
    return true;
  }

  function scope() {
    if (panel && !panel.hidden) return panel;
    var dialogs = document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]');
    for (var i = dialogs.length - 1; i >= 0; i--) {
      if (visible(dialogs[i])) return dialogs[i];
    }
    return document;
  }

  function items() {
    return Array.prototype.filter.call(scope().querySelectorAll(selector), function (el) {
      if (el.id === 'sc-tv-badge' || el.getAttribute('tabindex') === '-1') return false;
      // A card with nested buttons should keep the buttons separately reachable.
      return visible(el);
    });
  }

  function editable(el) {
    return el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable ||
      el.getAttribute('contenteditable') === 'true');
  }

  function focus(el) {
    if (!el) return;
    if (current && current !== el) current.removeAttribute('data-sc-tv-focus');
    current = el;
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|TEXTAREA|SELECT|IFRAME|VIDEO)$/.test(el.tagName)) {
      el.setAttribute('tabindex', '0');
    }
    el.setAttribute('data-sc-tv-focus', 'true');
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    // The positional form is intentional for older Tizen web engines.
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }); }
    catch (e) { if (el.scrollIntoView) el.scrollIntoView(false); }
  }

  function ensureFocus() {
    var list = items();
    var active = document.activeElement;
    if (list.indexOf(active) !== -1) {
      if (current !== active) focus(active);
      return;
    }
    if (list.indexOf(current) !== -1) return;
    var preferred = document.querySelector('.info-button.play');
    focus(list.indexOf(preferred) !== -1 ? preferred : list[0]);
  }

  function move(code) {
    var list = items();
    if (!current || list.indexOf(current) === -1) { ensureFocus(); return; }
    var from = current.getBoundingClientRect();
    var horizontal = code === 37 || code === 39;
    var positive = code === 39 || code === 40;
    var best = null;
    var bestScore = Infinity;
    list.forEach(function (el) {
      if (el === current) return;
      var to = el.getBoundingClientRect();
      var dx = (to.left + to.right - from.left - from.right) / 2;
      var dy = (to.top + to.bottom - from.top - from.bottom) / 2;
      var forward = horizontal ? dx : dy;
      if ((positive ? forward : -forward) <= 1) return;
      var sideways = Math.abs(horizontal ? dy : dx);
      var overlap = horizontal ? Math.min(from.bottom, to.bottom) - Math.max(from.top, to.top) :
        Math.min(from.right, to.right) - Math.max(from.left, to.left);
      var score = Math.abs(forward) + sideways * 3 + (overlap > 0 ? 0 : 500);
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) focus(best);
    else if (scope() === document) {
      window.scrollBy(horizontal ? (positive ? 320 : -320) : 0,
        horizontal ? 0 : (positive ? 280 : -280));
    }
  }

  function notify(message) {
    badge.textContent = message;
    badge.hidden = false;
    window.clearTimeout(badgeTimer);
    badgeTimer = window.setTimeout(function () { badge.hidden = true; }, 6500);
  }

  function closePanel() {
    panel.hidden = true;
    if (visible(previous)) focus(previous);
    else ensureFocus();
  }

  function togglePanel() {
    if (!panel.hidden) { closePanel(); return; }
    previous = document.activeElement;
    panel.hidden = false;
    focus(panel.querySelector('button'));
  }

  function media(code) {
    var videos = Array.prototype.filter.call(document.querySelectorAll('video'), visible);
    var video = videos.filter(function (v) { return !v.paused; })[0] || videos[0];
    if (!video) return false; // Cross-origin players keep their own controls.
    try {
      if (code === 415 || ((code === 10252 || code === 179) && video.paused)) {
        var playing = video.play();
        if (playing && playing.catch) playing.catch(function () { notify('Premi OK sul lettore per avviare il video.'); });
      } else if (code === 19 || code === 413 || code === 10252 || code === 179) {
        video.pause();
      } else if (code === 417 || code === 412) {
        var start = video.seekable.length ? video.seekable.start(0) : 0;
        var end = video.seekable.length ? video.seekable.end(video.seekable.length - 1) : video.duration;
        if (!isFinite(end)) return false;
        video.currentTime = Math.max(start, Math.min(end, video.currentTime + (code === 417 ? 10 : -10)));
      } else return false;
      return true;
    } catch (e) { return false; }
  }

  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function onKey(event) {
    var names = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
      Enter: 13, Escape: 27, BrowserBack: 10009, Info: 457, ColorF3Blue: 406,
      MediaPlayPause: 10252, MediaPlay: 415, MediaPause: 19, MediaStop: 413,
      MediaFastForward: 417, MediaRewind: 412 };
    var code = event.keyCode || names[event.key];
    var active = document.activeElement;
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    if (code === 457 || code === 406) {
      consume(event);
      if (!event.repeat) togglePanel();
      return;
    }
    if (code === 27 || code === 10009) {
      if (!panel.hidden) { consume(event); closePanel(); }
      else if (editable(active)) { consume(event); active.blur(); }
      else if (document.fullscreenElement || document.webkitFullscreenElement) {
        consume(event);
        var exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) {
          var result = exit.call(document);
          if (result && result.catch) result.catch(function () {});
        }
      } else if (window.history.length > 1) {
        consume(event);
        if (!event.repeat) window.history.back();
      }
      return;
    }
    if (panel.hidden && media(code)) { consume(event); return; }
    // Preserve the TV keyboard, native select menus, video and embedded players.
    if (editable(active) || (active && /^(VIDEO|IFRAME)$/.test(active.tagName))) return;
    if (code >= 37 && code <= 40) { consume(event); move(code); }
    else if (code === 13) {
      if (!visible(current)) ensureFocus();
      if (current) {
        consume(event);
        if (!event.repeat) {
          if (editable(current) || /^(VIDEO|IFRAME)$/.test(current.tagName)) current.focus();
          else current.click();
        }
      }
    }
  }

  function init() {
    var style = document.createElement('style');
    style.id = 'sc-tv-style';
    style.textContent = '[data-sc-tv-focus="true"]{outline:4px solid #ffe05b!important;outline-offset:3px!important;}' +
      '#sc-tv-panel,#sc-tv-badge{font:22px/1.5 sans-serif;color:#fff;background:#14151f;' +
      'position:fixed;z-index:2147483647;border:2px solid #68697c;border-radius:14px;padding:24px;}' +
      '#sc-tv-panel{top:12%;left:15%;right:15%;box-shadow:0 0 0 100vmax rgba(0,0,0,.8);}' +
      '#sc-tv-panel h2{font:700 30px/1.3 sans-serif;margin:0 0 16px;color:white;}' +
      '#sc-tv-panel p{font:22px/1.5 sans-serif;margin:12px 0;color:white;}' +
      '#sc-tv-panel button,#sc-tv-panel a{display:inline-block;margin:12px;padding:12px 20px;' +
      'font:22px sans-serif;color:white;background:#33364b;border:0;border-radius:8px;text-decoration:none;}' +
      '#sc-tv-panel[hidden],#sc-tv-badge[hidden]{display:none!important;}' +
      '#sc-tv-badge{right:4%;bottom:5%;max-width:75%;pointer-events:none;font-size:20px;}';
    (document.head || document.documentElement).appendChild(style);
    panel = document.createElement('div');
    panel.id = 'sc-tv-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'StreamingCommunity TV: comandi');
    panel.innerHTML = '<h2>StreamingCommunity TV</h2>' +
      '<p>Frecce: naviga · OK: seleziona · Return: torna indietro</p>' +
      '<p>Nei campi di ricerca usa la tastiera della TV. Return esce dal campo.</p>' +
      '<p>Info o tasto blu: apri o chiudi questo menu.</p>' +
      '<p>I tasti multimediali funzionano con i video accessibili nella pagina. ' +
      'Per i lettori incorporati usa i comandi del lettore.</p>' +
      '<button type="button" data-action="close">Torna al sito</button>' +
      '<a data-action="home">Pagina iniziale</a>' +
      '<button type="button" data-action="reload">Ricarica</button>';
    panel.querySelector('[data-action="home"]').href = HOME_URL;
    panel.querySelector('[data-action="close"]').onclick = closePanel;
    panel.querySelector('[data-action="reload"]').onclick = function () { location.reload(); };
    document.body.appendChild(panel);
    badge = document.createElement('div');
    badge.id = 'sc-tv-badge';
    badge.setAttribute('role', 'status');
    document.body.appendChild(badge);
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', function (event) {
      if (items().indexOf(event.target) !== -1 && current !== event.target) focus(event.target);
    });
    if (window.MutationObserver) {
      new MutationObserver(function () {
        if (refreshTimer) return;
        refreshTimer = window.setTimeout(function () { refreshTimer = null; ensureFocus(); }, 120);
      }).observe(document.body, { childList: true, subtree: true, attributes: true,
        attributeFilter: ['hidden', 'aria-hidden', 'aria-disabled', 'disabled', 'open', 'class', 'style'] });
    }
    ensureFocus();
    notify('StreamingCommunity TV · Info o tasto blu per i comandi');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
