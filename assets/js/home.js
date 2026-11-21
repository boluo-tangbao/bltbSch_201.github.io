const travelCover = document.querySelector('.home-travel-cover[data-src]');
if (travelCover) {
  const frame = travelCover.closest('.home-travel-frame');
  const coverObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    travelCover.src = travelCover.dataset.src;
    coverObserver.disconnect();
  }, { rootMargin: '120px 0px' });
  coverObserver.observe(frame);
}

async function initializePersonalSnapshots() {
  const section = document.getElementById('personal-snapshots');
  const dialog = document.getElementById('snapshot-dialog');
  if (!section || !dialog) return;
  const viewport = section.querySelector('.snapshot-window');
  const image = document.getElementById('snapshot-full-image');
  const imageStatus = dialog.querySelector('.snapshot-image-status');
  const paletteButton = section.querySelector('.snapshots-palette');
  const palettes = [['violet', '紫色'], ['mint', '薄荷绿'], ['peach', '蜜桃色']];
  let palette = 0;
  paletteButton.hidden = false;
  paletteButton.addEventListener('click', () => {
    palette = (palette + 1) % palettes.length;
    section.dataset.palette = palettes[palette][0];
    section.querySelector('.snapshots-status').textContent = `换成${palettes[palette][1]}了。`;
  });
  section.addEventListener('click', event => {
    const link = event.target.closest('[data-snapshot-open]');
    if (!link || typeof dialog.showModal !== 'function') return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const card = link.closest('.snapshot-card');
    const title = card.querySelector('h3').textContent;
    dialog.querySelector('#snapshot-dialog-title').textContent = title;
    dialog.querySelector('.snapshots-eyebrow').textContent = `PERSONAL SNAPSHOT / ${card.querySelector('.snapshot-meta > span:last-child').textContent.replace('NO. ', '')}`;
    dialog.querySelector('.snapshot-dialog-caption').textContent = `收录于 ${card.querySelector('time').textContent} · 图片由本人提供`;
    dialog.querySelectorAll('a').forEach(anchor => { anchor.href = link.href; });
    imageStatus.hidden = true;
    image.alt = `${title}完整结果图`;
    image.src = link.href;
    dialog.showModal();
    dialog.scrollTop = 0;
  });
  image.addEventListener('error', () => { imageStatus.hidden = false; });
  image.addEventListener('load', () => { imageStatus.hidden = true; });
  dialog.querySelector('.snapshot-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });

  try {
    const response = await fetch('assets/data/personal-snapshots.json');
    if (!response.ok) throw new Error('Snapshot manifest unavailable');
    const records = await response.json();
    if (!Array.isArray(records) || !records.length) return;
    const template = viewport.querySelector('.snapshot-card');
    const fragment = document.createDocumentFragment();
    records.forEach((record, index) => {
      const card = template.cloneNode(true);
      card.id = `snapshot-${record.id}`;
      card.dataset.snapshotId = record.id;
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', '幻灯片');
      card.setAttribute('aria-label', `${index + 1} / ${records.length}：${record.title}`);
      card.querySelector('.snapshot-sticker').textContent = record.sticker;
      card.querySelector('.snapshot-meta > span:last-child').textContent = `NO. ${String(index + 1).padStart(3, '0')}`;
      const title = card.querySelector('h3');
      const highlight = document.createElement('em');
      highlight.textContent = record.highlight;
      title.replaceChildren(document.createTextNode(record.heading), document.createElement('br'), highlight);
      card.querySelector('.snapshot-description').textContent = record.description;
      card.querySelector('.snapshot-number').textContent = record.countLabel || '';
      const preview = card.querySelector('img');
      preview.src = record.preview;
      preview.alt = `${record.title}结果图`;
      card.querySelectorAll('[data-snapshot-open]').forEach(link => {
        link.href = record.fullImage;
        link.setAttribute('aria-haspopup', 'dialog');
      });
      card.querySelector('.snapshot-art').setAttribute('aria-label', `放大查看${record.title}`);
      const time = card.querySelector('time');
      time.dateTime = record.recordedAt;
      time.textContent = record.recordedAt.replaceAll('-', '.');
      card.querySelector('.snapshot-tags').replaceChildren(...record.tags.map(tag => {
        const span = document.createElement('span');
        span.textContent = tag;
        return span;
      }));
      fragment.append(card);
    });
    viewport.replaceChildren(fragment);
    if (records.length > 1) initializeSnapshotCarousel(section, viewport, dialog);
  } catch {
    section.querySelector('.snapshots-status').textContent = '其他切片暂时没有加载出来，可以刷新页面再试。';
  }
}
initializePersonalSnapshots();

function initializeSnapshotCarousel(section, viewport, dialog) {
  const cards = [...viewport.querySelectorAll('.snapshot-card')];
  const controls = section.querySelector('.snapshot-controls');
  const dots = section.querySelector('.snapshot-dots');
  const playButton = section.querySelector('.snapshot-play');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let playing = !reducedMotion.matches;
  let visible = false;
  let hovered = false;
  let focused = false;
  let timer;
  function schedule() {
    clearTimeout(timer);
    if (playing && visible && !hovered && !focused && !document.hidden && !dialog.open) {
      timer = setTimeout(() => { goTo(current + 1); schedule(); }, 6500);
    }
  }
  function updatePlayButton() {
    playButton.textContent = playing ? '暂停轮播 Ⅱ' : '自动轮播 ▷';
    playButton.setAttribute('aria-label', playing ? '暂停自动轮播' : '开始自动轮播');
    schedule();
  }
  function stopPlaying() { playing = false; updatePlayButton(); }
  function updateSelection() {
    section.querySelector('.snapshot-position').textContent = `${String(current + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    cards.forEach((card, index) => {
      card.inert = index !== current;
      dots.children[index].setAttribute('aria-current', String(index === current));
    });
  }
  function goTo(index) {
    const target = (index + cards.length) % cards.length;
    viewport.scrollTo({ left: target * viewport.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  function manuallyGoTo(index) { stopPlaying(); goTo(index); }
  cards.forEach((card, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.textContent = card.querySelector('h3 em').textContent;
    dot.setAttribute('aria-label', `查看${card.querySelector('h3').textContent}`);
    dot.setAttribute('aria-controls', card.id);
    dot.addEventListener('click', () => manuallyGoTo(index));
    dots.append(dot);
  });
  section.querySelector('[data-snapshot-prev]').addEventListener('click', () => manuallyGoTo(current - 1));
  section.querySelector('[data-snapshot-next]').addEventListener('click', () => manuallyGoTo(current + 1));
  playButton.addEventListener('click', () => { playing = !playing; updatePlayButton(); });
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    manuallyGoTo(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  viewport.addEventListener('pointerdown', stopPlaying, { passive: true });
  viewport.addEventListener('scroll', () => {
    const selected = Math.round(viewport.scrollLeft / viewport.clientWidth);
    if (selected === current || !cards[selected]) return;
    current = selected;
    updateSelection();
    if (!playing) section.querySelector('.snapshots-status').textContent = `第 ${current + 1} 份，共 ${cards.length} 份：${cards[current].querySelector('h3').textContent}`;
  }, { passive: true });
  section.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
  section.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  section.addEventListener('focusin', () => { focused = true; schedule(); });
  section.addEventListener('focusout', () => {
    queueMicrotask(() => { focused = section.contains(document.activeElement); schedule(); });
  });
  document.addEventListener('visibilitychange', schedule);
  dialog.addEventListener('close', schedule);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stopPlaying(); });
  let width = viewport.clientWidth;
  new ResizeObserver(() => {
    if (width === viewport.clientWidth) return;
    width = viewport.clientWidth;
    viewport.scrollTo({ left: current * width, behavior: 'instant' });
  }).observe(viewport);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { threshold: .15 }).observe(viewport);
  controls.hidden = false;
  updateSelection();
  updatePlayButton();
}
