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
    image.src = event.cover;
    image.alt = `${event.name}的现场记录`;
    entry.href = `activities.html#event/${encodeURIComponent(event.id)}`;
    document.getElementById('home-latest-event-caption').textContent = `${event.dateLabel} · ${event.name}`;
  } catch {
    // The activity archive remains accessible through the original link.
  }
}
initializeLatestEvent();
