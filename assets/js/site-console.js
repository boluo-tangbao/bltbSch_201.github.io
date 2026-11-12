(() => {
  if (document.getElementById('site-console')) return;
  const script = document.currentScript;
  const root = new URL('../../', script.src);
  const storageKey = `site-console:${root.pathname}`;
  const playbackKey = `${storageKey}:playback`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Preferences are optional. */ }
  const state = {
    volume: Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.5,
    effects: saved.effects !== false,
    cursor: saved.cursor !== false,
    track: typeof saved.track === 'string' ? saved.track : '',
    time: Number.isFinite(saved.time) ? Math.max(0, saved.time) : 0,
  };
  const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Playback works without storage. */ } };
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('assets/css/site-console.css?v=8', root).href;
  document.head.append(stylesheet);
  const host = document.createElement('aside');
  host.id = 'site-console';
  host.setAttribute('aria-label', '网站控制台');
  host.innerHTML = `
    <section class="sc-panel" id="sc-panel" role="dialog" aria-labelledby="sc-heading" aria-hidden="true" inert>
      <div class="sc-heading"><h2 id="sc-heading">随身控制台</h2><button type="button" class="sc-close" aria-label="关闭控制台">关闭</button></div>
      <nav class="sc-destinations" aria-label="精选入口">
        <a class="sc-destination sc-home" data-home aria-label="个人主页"><span class="sc-destination-label"><strong>个人主页</strong><span aria-hidden="true">↗</span></span><span class="sc-destination-note">生活里的小小收藏</span></a>
        <a class="sc-destination sc-board" data-board aria-label="逛店榜单"><span class="sc-destination-label"><strong>逛店榜单</strong><span aria-hidden="true">↗</span></span><span class="sc-destination-note">下一站，去哪里？</span></a>
      </nav>
      <section class="sc-section" aria-labelledby="sc-music-heading">
        <h3 id="sc-music-heading">背景音乐</h3>
        <div class="sc-record"><div class="sc-disc" aria-hidden="true"><span></span></div><div><strong class="sc-title">音乐准备中</strong><p class="sc-muted sc-count">等待添加网站歌单</p></div></div>
        <div class="sc-row sc-time"><span data-current>00:00</span><span data-duration>00:00</span></div>
        <input type="range" data-seek min="0" max="100" value="0" step="0.1" aria-label="播放进度" disabled>
        <div class="sc-transport"><button type="button" data-prev aria-label="上一首" disabled>上一首</button><button type="button" class="sc-play" data-play disabled>播放</button><button type="button" data-next aria-label="下一首" disabled>下一首</button></div>
        <label class="sc-row"><span>音量</span><output data-volume-label></output></label><input type="range" data-volume min="0" max="100" step="1" aria-label="音量">
        <p class="sc-status" role="status" aria-live="polite">歌单添加后，点击播放就能边听边逛。</p>
        <details data-queue-details hidden><summary>播放列表</summary><div class="sc-playlist"></div></details>
        <details><summary>试听本机音频</summary><button type="button" class="sc-file" data-add>选择本机音乐</button><p class="sc-muted">仅在当前页面试听，不会上传。</p></details><input type="file" data-files accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac" multiple hidden>
      </section>
      <section class="sc-section" aria-labelledby="sc-effects-heading"><h3 id="sc-effects-heading">浏览偏好</h3><label class="sc-check">点击星光<input type="checkbox" data-effects></label><label class="sc-check">菠萝鼠标<input type="checkbox" data-cursor></label></section>
    </section>
    <button type="button" class="sc-launcher" aria-label="展开控制台" aria-controls="sc-panel" aria-expanded="false"><svg class="sc-launcher-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 3v7m0 5v6M12 3v2m0 5v11M19 3v10m0 5v3"/><circle cx="5" cy="12.5" r="2.5"/><circle cx="12" cy="7.5" r="2.5"/><circle cx="19" cy="15.5" r="2.5"/></svg><span class="sc-tab-title" aria-hidden="true">控制台</span></button>`;
  document.body.append(host);
  const $ = selector => host.querySelector(selector);
  const panel = $('.sc-panel'), launcher = $('.sc-launcher');
  const hoverAvailable = matchMedia('(any-hover: hover)');
  const inlineLayout = matchMedia('(max-width: 900px)');
  const findInlineTarget = () => document.querySelector('.theme-toolbar, .navbar .nav-links, .site-nav nav');
  function placeLauncher() {
    const inlineTarget = findInlineTarget();
    if (inlineLayout.matches && inlineTarget) inlineTarget.append(launcher);
    else host.append(launcher);
  }
  placeLauncher();
  // The shared script can finish before the rank app mounts its header.
  if (!findInlineTarget()) {
    const headerObserver = new MutationObserver(() => {
      if (findInlineTarget()) { placeLauncher(); headerObserver.disconnect(); }
    });
    headerObserver.observe(document.body, { childList: true, subtree: true });
  }
  inlineLayout.addEventListener('change', () => { close(false); placeLauncher(); });
  let closeTimer;
  function open(focusContent = false) {
    clearTimeout(closeTimer);
    panel.inert = false;
    panel.removeAttribute('aria-hidden');
    host.classList.add('sc-open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', '收起控制台');
    if (focusContent) $('[data-home]').focus({ preventScroll: true });
  }
  function close(restoreFocus = true) {
    clearTimeout(closeTimer);
    if (restoreFocus || panel.contains(document.activeElement)) launcher.focus({ preventScroll: true });
    panel.inert = true;
    panel.setAttribute('aria-hidden', 'true');
    host.classList.remove('sc-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', '展开控制台');
  }
  host.addEventListener('pointerenter', event => {
    if (!inlineLayout.matches && event.pointerType === 'mouse' && hoverAvailable.matches) open();
  });
  host.addEventListener('pointerleave', event => {
    if (inlineLayout.matches || event.pointerType !== 'mouse' || !hoverAvailable.matches) return;
    clearTimeout(closeTimer);
    // Bridge the moving tab and panel while the drawer slides under the pointer.
    closeTimer = setTimeout(() => close(false), 140);
  });
  launcher.addEventListener('click', event => {
    if (!inlineLayout.matches && event.pointerType === 'mouse' && hoverAvailable.matches && event.detail > 0) return open();
    if (host.classList.contains('sc-open')) return close();
    open(inlineLayout.matches || event.detail === 0);
  });
  $('.sc-close').addEventListener('click', () => close());
  host.addEventListener('focusout', event => {
    if (event.relatedTarget && !host.contains(event.relatedTarget) && event.relatedTarget !== launcher) close(false);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && host.classList.contains('sc-open')) { event.preventDefault(); close(); } });
  document.addEventListener('click', event => { if (!host.contains(event.target) && !launcher.contains(event.target) && host.classList.contains('sc-open')) close(false); });
  for (const [key, path] of Object.entries({ home: './', board: 'rank/' })) $(`[data-${key}]`).href = new URL(path, root).href;
  function applyPreferences() {
    document.documentElement.dataset.siteEffects = state.effects ? 'on' : 'off';
    document.documentElement.dataset.siteCursor = state.cursor ? 'on' : 'off';
    $('[data-effects]').checked = state.effects;
    $('[data-cursor]').checked = state.cursor;
  }
  applyPreferences();
  for (const key of ['effects', 'cursor']) $(`[data-${key}]`).addEventListener('change', event => { state[key] = event.target.checked; applyPreferences(); persist(); });
  // One audio element survives panel closure and the rank app's internal navigation.
  const audio = new Audio();
  audio.preload = 'metadata'; audio.volume = state.volume;
  let queue = [], index = -1, localQueue = false, lastSaved = 0, selection = 0;
  const status = message => { $('.sc-status').textContent = message; };
  const format = seconds => { const value = Number.isFinite(seconds) ? Math.floor(seconds) : 0; return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`; };
  function updateTime() {
    $('[data-current]').textContent = format(audio.currentTime);
    $('[data-duration]').textContent = format(audio.duration);
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    $('[data-seek]').disabled = !duration;
    $('[data-seek]').value = duration ? String(audio.currentTime / duration * 100) : '0';
    $('[data-seek]').setAttribute('aria-valuetext', `${format(audio.currentTime)} / ${format(duration)}`);
  }
  function savePosition() {
    if (!localQueue && queue[index]) { state.track = queue[index].src; state.time = audio.currentTime; persist(); }
  }
  function renderQueue() {
    $('[data-queue-details]').hidden = !queue.length;
    $('.sc-playlist').replaceChildren(...queue.map((track, position) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = `${position + 1}. ${track.title}`;
      button.setAttribute('aria-current', String(position === index));
      button.addEventListener('click', () => select(position, !audio.paused)); return button;
    }));
  }
  async function play() {
    const request = selection;
    try { await audio.play(); if (request === selection) status('正在播放 · 收起控制台也会继续'); }
    catch (error) { if (request === selection && error.name !== 'AbortError') status(error.name === 'NotAllowedError' ? '浏览器需要你点击播放才能继续。' : '这首音频暂时无法播放，请换一首或检查文件。'); }
  }
  function select(position, autoplay = false, resume = 0) {
    selection++; audio.pause(); index = (position + queue.length) % queue.length;
    const track = queue[index]; audio.src = track.src;
    if (resume) audio.currentTime = resume;
    audio.onloadedmetadata = () => { if (resume && Number.isFinite(audio.duration)) audio.currentTime = Math.min(resume, Math.max(0, audio.duration - 0.1)); updateTime(); };
    $('.sc-title').textContent = track.title; $('.sc-count').textContent = `${index + 1} / ${queue.length}${localQueue ? ' · 本机音乐' : ' · 网站歌单'}`;
    $('[data-play]').disabled = false;
    $('[data-prev]').disabled = $('[data-next]').disabled = queue.length < 2;
    updateTime(); renderQueue(); status(resume ? '已记住上次进度，点击播放继续。' : '已就绪，点击播放。');
    if (autoplay) void play();
  }
  $('[data-play]').addEventListener('click', () => { if (audio.paused) void play(); else { audio.pause(); status('已暂停'); } });
  $('[data-prev]').addEventListener('click', () => select(index - 1, !audio.paused));
  $('[data-next]').addEventListener('click', () => select(index + 1, !audio.paused));
  $('[data-seek]').addEventListener('input', event => { if (Number.isFinite(audio.duration)) { audio.currentTime = Number(event.target.value) / 100 * audio.duration; updateTime(); savePosition(); } });
  function updateVolume() { $('[data-volume]').value = String(Math.round(state.volume * 100)); $('[data-volume-label]').textContent = `${Math.round(state.volume * 100)}%`; }
  updateVolume();
  $('[data-volume]').addEventListener('input', event => { state.volume = Number(event.target.value) / 100; audio.volume = state.volume; updateVolume(); persist(); });
  audio.addEventListener('play', () => { host.classList.add('sc-playing'); $('[data-play]').textContent = '暂停'; });
  audio.addEventListener('pause', () => { host.classList.remove('sc-playing'); $('[data-play]').textContent = '播放'; savePosition(); });
  audio.addEventListener('timeupdate', () => { updateTime(); if (Date.now() - lastSaved > 5000) { savePosition(); lastSaved = Date.now(); } });
  audio.addEventListener('ended', () => { if (queue.length > 1) select(index + 1, true); else { audio.currentTime = 0; savePosition(); status('播放完毕，可以再听一次。'); } });
  audio.addEventListener('error', () => status('无法读取这首音频，请换一首或检查文件。'));
  window.addEventListener('pagehide', () => {
    savePosition();
    try {
      if (localQueue) sessionStorage.removeItem(playbackKey);
      else if (queue[index]) sessionStorage.setItem(playbackKey, JSON.stringify({
        track: state.track, time: state.time, playing: !audio.paused && !audio.ended,
      }));
    } catch { /* Playback works without storage. */ }
  });
  function restorePlayback() {
    if (localQueue || !queue.length) return;
    let playback;
    try { playback = JSON.parse(sessionStorage.getItem(playbackKey)); } catch { /* Fall back to saved progress. */ }
    const previous = queue.findIndex(track => track.src === (playback?.track ?? state.track));
    const time = playback?.time ?? state.time;
    select(Math.max(0, previous), previous >= 0 && playback?.playing === true,
      previous >= 0 && Number.isFinite(time) ? Math.max(0, time) : 0);
  }
  window.addEventListener('pageshow', event => { if (event.persisted) restorePlayback(); });
  $('[data-add]').addEventListener('click', () => $('[data-files]').click());
  $('[data-files]').addEventListener('change', event => {
    const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('audio/') || /\.(mp3|m4a|ogg|wav|flac)$/i.test(file.name));
    if (!files.length) return;
    audio.pause(); if (localQueue) queue.forEach(track => URL.revokeObjectURL(track.src));
    localQueue = true; queue = files.map(file => ({ title: file.name.replace(/\.[^.]+$/, ''), src: URL.createObjectURL(file) }));
    select(0); status('本机音乐不会上传；离开或刷新页面后需要重新选择。'); event.target.value = '';
  });
  fetch(new URL('assets/music/playlist.json', root)).then(response => { if (!response.ok) throw new Error('Playlist unavailable'); return response.json(); }).then(tracks => {
    if (localQueue || !Array.isArray(tracks)) return;
    queue = tracks.filter(track => track && typeof track.title === 'string' && typeof track.src === 'string').flatMap(track => {
      try { const url = new URL(track.src, root); return /^https?:$/.test(url.protocol) ? [{ title: track.title, src: url.href }] : []; } catch { return []; }
    });
    restorePlayback();
  }).catch(() => status('网站歌单暂未加载，可选择本机音乐。'));
})();
