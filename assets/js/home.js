// Keep the home preview in step with the activity archive.
async function initializeLatestEvent() {
  const entry = document.getElementById('home-latest-event');
  if (!entry) return;
  try {
    const response = await fetch('assets/generated/activities/manifest.json');
    if (!response.ok) return;
    const events = await response.json();
    const event = events[0];
    if (!event) return;
    const image = entry.querySelector('img');
    if (event.cover) {
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      image.src = event.cover;
      image.alt = `${event.name}的现场记录`;
    } else {
      image.remove();
    }
    entry.href = `activities.html#event/${encodeURIComponent(event.id)}`;
    document.getElementById('home-latest-event-caption').textContent = `${event.dateLabel} · ${event.name}`;
  } catch {
    // The activity archive remains accessible through the original link.
  }
}
initializeLatestEvent();

function initializePersonalSnapshots() {
  const section = document.getElementById('personal-snapshots');
  const dialog = document.getElementById('snapshot-dialog');
  if (!section || !dialog || typeof dialog.showModal !== 'function') return;
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
  section.querySelectorAll('[data-snapshot-open]').forEach(link => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      imageStatus.hidden = true;
      image.src = link.href;
      dialog.showModal();
      dialog.scrollTop = 0;
    });
  });
  image.addEventListener('error', () => { imageStatus.hidden = false; });
  image.addEventListener('load', () => { imageStatus.hidden = true; });
  dialog.querySelector('.snapshot-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
initializePersonalSnapshots();
