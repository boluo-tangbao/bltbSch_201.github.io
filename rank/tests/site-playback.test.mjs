import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../assets/js/site-console.js', import.meta.url), 'utf8');

async function setup({ reduced = false, playback, blocked = false, webAudio = false } = {}) {
  let now = 0, id = 0, audio;
  const timers = new Map(), nodes = new Map(), classes = () => {
    const values = new Set();
    return { add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value) };
  };
  class Element {
    constructor() { this.listeners = {}; this.classList = classes(); this.dataset = {}; this.attributes = {}; this.children = []; }
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
    emit(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event); }
    querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); }
    append(...children) { this.children.push(...children); }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this.attributes[key]; }
    hasAttribute(key) { return key in this.attributes; }
    contains(node) { return node === this; }
    focus() {}
    replaceChildren(...children) { this.children = children; }
  }
  class Audio extends Element {
    constructor() { super(); audio = this; this.paused = true; this.ended = false; this.currentTime = 0; this.duration = 120; this.volume = 1; }
    async play() { if (blocked) throw Object.assign(new Error(), { name: 'NotAllowedError' }); this.paused = false; this.emit('play'); }
    pause() { if (!this.paused) { this.paused = true; this.emit('pause'); } }
  }
  const storage = new Map();
  if (playback) storage.set('site-console:/demo/:playback', JSON.stringify(playback));
  const sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const document = new Element(); document.currentScript = { src: 'https://example.test/demo/assets/js/site-console.js' };
  document.head = new Element(); document.body = new Element(); document.documentElement = new Element(); document.getElementById = () => null;
  document.createElement = () => new Element();
  const location = { href: 'https://example.test/demo/index.html', origin: 'https://example.test', pathname: '/demo/index.html', search: '', assigned: [], assign(value) { this.assigned.push(value); } };
  const window = new Element();
  let gain;
  if (webAudio) window.AudioContext = class {
    constructor() { this.destination = {}; }
    createMediaElementSource() { return { connect: node => node }; }
    createGain() { gain = { gain: { value: 1 }, connect() { return this; } }; return gain; }
    async resume() {}
  };
  const timeout = (fn, delay = 0) => { const key = ++id; timers.set(key, { fn, at: now + delay }); return key; };
  vm.runInNewContext(source, {
    window, document, location, Audio, URL, localStorage: { getItem: () => null, setItem() {} }, sessionStorage,
    matchMedia: query => ({ matches: query.includes('reduced-motion') && reduced, addEventListener() {} }),
    performance: { now: () => now }, setTimeout: timeout, clearTimeout: key => timers.delete(key),
    requestAnimationFrame: fn => timeout(() => fn(now), 16), cancelAnimationFrame: key => timers.delete(key),
    fetch: async () => ({ ok: true, json: async () => [{ title: 'Test song', src: 'assets/music/test.mp3' }] }),
  });
  await new Promise(resolve => setImmediate(resolve));
  function advance(ms) {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = end;
  }
  function click(href, options = {}) {
    const { target: linkTarget, ...eventOptions } = options;
    const anchor = new Element(); anchor.href = href; anchor.closest = () => anchor;
    if (linkTarget) anchor.target = linkTarget;
    if (options.download) anchor.setAttribute('download', '');
    const event = { target: anchor, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...eventOptions };
    document.emit('click', event); return event;
  }
  return { audio, nodes, document, window, location, storage, advance, click, get gain() { return gain; }, async play() { nodes.get('[data-play]').emit('click'); await new Promise(resolve => setImmediate(resolve)); advance(450); } };
}

test('playing music fades out before navigation, saves the final position, then fades in on the destination', async () => {
  const app = await setup(); await app.play();
  assert.equal(app.audio.volume, .5);
  app.audio.currentTime = 32;
  app.click('https://example.test/demo/art.html');
  app.advance(140);
  assert.ok(app.audio.volume > 0 && app.audio.volume < .5);
  assert.equal(app.location.assigned.length, 0);
  app.audio.currentTime = 32.25;
  app.advance(140);
  assert.equal(app.audio.volume, 0);
  assert.equal(app.location.assigned.length, 1);
  const playback = JSON.parse(app.storage.get('site-console:/demo/:playback'));
  assert.equal(playback.playing, true); assert.equal(playback.time, 32.25);
  const destination = await setup({ playback });
  assert.equal(destination.audio.paused, false); assert.equal(destination.audio.currentTime, 32.25);
  destination.advance(200); assert.ok(destination.audio.volume > 0 && destination.audio.volume < .5);
  destination.advance(250); assert.equal(destination.audio.volume, .5);
});

test('paused music stays paused on the next page', async () => {
  const app = await setup(); app.audio.currentTime = 15;
  app.click('https://example.test/demo/travel.html'); app.advance(200);
  const playback = JSON.parse(app.storage.get('site-console:/demo/:playback'));
  assert.equal(playback.playing, false);
  const destination = await setup({ playback });
  assert.equal(destination.audio.paused, true); assert.equal(destination.audio.currentTime, 15);
});

test('anchors, external links, assets, downloads, new tabs and app-handled clicks retain native behavior', async () => {
  const app = await setup();
  const urls = ['https://example.test/demo/index.html#sports', 'https://external.test/', 'https://example.test/demo/images/photo.jpg'];
  for (const url of urls) assert.equal(app.click(url).defaultPrevented, false);
  const target = 'https://example.test/demo/art.html';
  for (const options of [{ target: '_blank' }, { ctrlKey: true }, { download: true }, { defaultPrevented: true }]) {
    const event = app.click(target, options);
    assert.equal(event.defaultPrevented, options.defaultPrevented || false);
  }
  app.advance(1000); assert.equal(app.location.assigned.length, 0);
});

test('repeated clicks navigate once and a failed navigation restores audio and clears the veil', async () => {
  const app = await setup(); await app.play();
  const target = 'https://example.test/demo/art.html';
  app.click(target); app.click(target); app.advance(280);
  assert.equal(app.location.assigned.length, 1);
  app.advance(4000);
  assert.equal(app.audio.volume, .5);
  assert.equal(app.document.documentElement.classList.contains('site-page-leaving'), false);
});

test('reduced motion disables the veil while preserving the music buffer', async () => {
  const app = await setup({ reduced: true }); await app.play();
  app.click('https://example.test/demo/art.html');
  assert.equal(app.document.documentElement.classList.contains('site-page-leaving'), false);
  app.advance(140); assert.equal(app.location.assigned.length, 0);
  app.advance(140); assert.equal(app.location.assigned.length, 1);
});

test('reduced motion with paused music navigates immediately without a timer', async () => {
  const app = await setup({ reduced: true });
  const target = 'https://example.test/demo/rank/guide/#/place/shanghai-shop-001';
  app.click(target);
  assert.deepEqual(app.location.assigned, [target]);
  assert.equal(app.document.documentElement.classList.contains('site-page-leaving'), false);
});

test('back-forward cache clears the departure state and restores playback', async () => {
  const app = await setup(); await app.play();
  app.click('https://example.test/demo/art.html'); app.advance(280);
  app.window.emit('pageshow', { persisted: true }); await new Promise(resolve => setImmediate(resolve)); app.advance(450);
  assert.equal(app.document.documentElement.classList.contains('site-page-leaving'), false);
  assert.equal(app.audio.paused, false); assert.equal(app.audio.volume, .5);
});

test('autoplay denial preserves the position and offers manual playback', async () => {
  const app = await setup({ blocked: true, playback: { track: 'https://example.test/demo/assets/music/test.mp3', time: 18, playing: true } });
  assert.equal(app.audio.paused, true); assert.equal(app.audio.currentTime, 18);
  assert.match(app.nodes.get('.sc-status').textContent, /点击播放/);
});


test('Web Audio fades the gain node while leaving native media volume fixed for mobile browsers', async () => {
  const app = await setup({ webAudio: true }); await app.play();
  assert.equal(app.audio.volume, 1); assert.equal(app.gain.gain.value, .5);
  app.click('https://example.test/demo/art.html'); app.advance(140);
  assert.equal(app.audio.volume, 1); assert.ok(app.gain.gain.value > 0 && app.gain.gain.value < .5);
  app.advance(140); assert.equal(app.gain.gain.value, 0);
});


test('initial pageshow does not cancel the incoming music fade', async () => {
  const app = await setup({ playback: { track: 'https://example.test/demo/assets/music/test.mp3', time: 18, playing: true } });
  app.advance(100); const before = app.audio.volume;
  app.window.emit('pageshow', { persisted: false });
  assert.equal(app.audio.volume, before);
  app.advance(350); assert.equal(app.audio.volume, .5);
});
