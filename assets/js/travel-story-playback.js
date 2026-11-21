function createTravelStoryPlayback(frames, render, updateControls) {
  const prepared = new Map();
  const last = frames.length - 1;
  let current = -1;
  let target = 0;
  let revision = 0;
  let playing = false;
  let timer;

  async function loadImage(url, fallback) {
    const image = new Image();
    image.src = url;
    const ready = await new Promise(resolve => {
      const deadline = setTimeout(() => resolve(false), 6000);
      image.decode().then(() => resolve(true), () => resolve(false))
        .finally(() => clearTimeout(deadline));
    });
    if (ready) return image;
    image.removeAttribute('src');
    return fallback ? loadImage(fallback) : null;
  }

  function prepare(index) {
    if (!prepared.has(index)) {
      prepared.set(index, Promise.all(frames[index].map(([url, fallback]) => loadImage(url, fallback))));
    }
    return prepared.get(index);
  }

  function schedule() {
    if (playing && current < last) timer = setTimeout(() => show(current + 1), 2400);
  }

  async function show(index) {
    target = Math.max(0, Math.min(index, last));
    const request = ++revision;
    const ready = prepare(target);
    for (let next = target + 1; next <= Math.min(target + 2, last); next++) prepare(next);
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
