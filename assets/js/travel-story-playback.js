function createTravelStoryPlayback(frames, render, updateControls) {
  const prepared = new Map();
  const last = frames.length - 1;
  let current = -1;
  let target = 0;
  let revision = 0;
  let playing = false;
  let timer;

  async function loadImage(url, fallback, priority) {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = priority;
    image.src = url;
    const ready = await new Promise(resolve => {
      const deadline = setTimeout(() => resolve(false), 6000);
      image.decode().then(() => resolve(true), () => resolve(false))
        .finally(() => clearTimeout(deadline));
    });
    if (ready) return image;
    image.removeAttribute('src');
    return fallback ? loadImage(fallback, null, priority) : null;
  }

  function prepare(index, priority) {
    if (!prepared.has(index)) {
      prepared.set(index, Promise.all(frames[index].map(([url, fallback]) => loadImage(url, fallback, priority))));
    }
    return prepared.get(index);
  }

  function schedule() {
    if (playing && current < last) timer = setTimeout(() => show(current + 1), 2400);
  }

  async function show(index) {
    target = Math.max(0, Math.min(index, last));
    const request = ++revision;
    const ready = prepare(target, 'high');
    for (const key of prepared.keys()) {
      if (key < target - 1 || key > target + 2) prepared.delete(key);
    }
    const images = await ready;
    if (request !== revision) return;
    current = target;
    render(current, images);
    if (current === last) playing = false;
    updateControls(playing, current === last);
    schedule();
    // Give the current frame its own request and decode before warming later pages.
    setTimeout(() => {
      if (request !== revision || document.hidden) return;
      const connection = navigator.connection;
      if (connection?.saveData || connection?.effectiveType?.includes('2g')) return;
      for (let next = current + 1; next <= Math.min(current + 2, last); next++) prepare(next, 'low');
    }, 0);
  }

  function stop() {
    clearTimeout(timer);
    // Pause cancels an automatic turn that is still waiting for its image.
    if (playing && current >= 0 && target !== current) {
      revision++;
      target = current;
    }
    playing = false;
    updateControls(false, current === last);
  }

  function go(index) {
    stop();
    return show(index);
  }

  return {
    go,
    stop,
    step: offset => go(target + offset),
    toggle() {
      if (playing) return stop();
      playing = true;
      updateControls(true, false);
      if (current === last) show(0);
      else if (current === target) schedule();
    },
  };
}
