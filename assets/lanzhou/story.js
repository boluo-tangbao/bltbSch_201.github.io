const requestedDay = new URLSearchParams(location.search).get('day') || '4.2';
const dayAlbum = window.tripDays.find(day => day.date === requestedDay) || window.tripDays[1];
const dayNumber = window.tripDays.indexOf(dayAlbum) + 1;
const dayTitles = ['初到武威','两座城之间','大地的褶皱','从小西湖到机场','从空中回望'];
const dayTitle = dayTitles[dayNumber - 1];
document.title = dayTitle + ' · 清明西北行';
document.querySelector('h1').firstChild.textContent = dayTitle;
document.querySelector('.mast > span').textContent = '4 月 ' + dayNumber + ' 日　／　第 ' + dayNumber + ' 天';
document.querySelector('.mast a:last-child').href = 'lanzhou-travel.html#' + dayAlbum.date;
const route = document.querySelector('.route');
if (dayNumber !== 2) route.textContent = dayNumber === 1 ? '上海 → 中川机场 → 武威' : dayNumber === 5 ? '兰州 · 返程' : '兰州';
const sections = dayAlbum.groups.filter(group => group.story);
const chapters = [];
const starts = [];
const files = new Map();
for (const group of sections) {
  const {stop,title,text,picks} = group.story;
  starts.push(chapters.length);
  const clips = group.media.filter(item => item.video);
  for (const clip of clips) files.set(clip.name,clip);
  picks.forEach((id,index) => {
    const item = group.media.find(media => media.id === id);
    files.set(item.name,item);
    chapters.push({place:group.label,stop,title,text,caption:item.caption,
      photos:[[item.name,item.caption || stop+' · '+(index+1)]],
      video:clips.length ? clips[index % clips.length].name : undefined, section:starts.length-1});
  });
}
const mediaPath = (name, small = false) => {
  const file = files.get(name);
  const suffix = file.video ? (small ? '-s.webp' : '.mp4') : ((dayNumber === 2 ? '-story' : '') + (small ? '-s.webp' : '.webp'));
  return 'assets/lanzhou/' + file.id + suffix;
};
const find = id => document.getElementById(id);

const cinema = find('cinema');
const video = cinema.querySelector('video');
let current = 0;
const playback = createTravelStoryPlayback(
  chapters.map(chapter => chapter.photos.map(([name]) => [mediaPath(name), mediaPath(name, true)])),
  draw,
  (playing, atEnd) => {
    find('play').textContent = playing ? 'Ⅱ 暂停播放' : atEnd ? '↺ 从头播放' : '▷ 播放手记';
    find('play').setAttribute('aria-pressed', String(playing));
  },
);

const periodNav = find('periods');
{
  periodNav.hidden = false;
  for (const period of new Set(sections.map(group => group.period))) {
    const button = document.createElement('button');
    button.textContent = period;
    button.onclick = () => playback.go(starts[sections.findIndex(group => group.period === period)]);
    periodNav.append(button);
  }
}

function draw(index, images) {
  current = index;
  const chapter = chapters[current];
  {
    for (const button of periodNav.children) {
      button.setAttribute('aria-current', String(button.textContent === sections[chapter.section].period));
    }
  }
  const visual = find('visual');
  const shots = chapter.photos.map(([, description], photoIndex) => {
    const frame = document.createElement('div');
    frame.className = 'shot';
    const photo = images[photoIndex];
    if (photo) {
      photo.alt = description;
      frame.append(photo);
    } else {
      const message = document.createElement('span');
      message.textContent = '照片暂时无法加载';
      frame.append(message);
    }
    return frame;
  });
  visual.classList.toggle('pair', shots.length > 1);
  visual.replaceChildren(...shots);
  find('counter').textContent = String(current + 1).padStart(2, '0') + ' / ' + String(chapters.length).padStart(2, '0');
  find('place').textContent = chapter.place;
  find('sceneTitle').textContent = chapter.caption || chapter.title;
  find('prose').textContent = chapter.text;
  find('clip').hidden = !chapter.video;
  find('progress').style.width = (current + 1) / chapters.length * 100 + '%';
  find('back').disabled = current === 0;
  find('next').disabled = current === chapters.length - 1;
  const buttons = Array.from(find('contents').children);
  buttons.forEach((button, index) => button.setAttribute('aria-current', String(index === chapter.section)));
  const nav = find('contents');
  if (nav.scrollWidth > nav.clientWidth) nav.scrollLeft += buttons[chapter.section].getBoundingClientRect().left - nav.getBoundingClientRect().left;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    visual.animate([{opacity: .55, transform: 'translateY(3px)'}, {opacity: 1, transform: 'none'}], {duration: 350});
  }
}

starts.forEach(index => {
  const chapter = chapters[index];
  const button = document.createElement('button');
  const photo = new Image();
  photo.alt = '';
  photo.src = mediaPath(chapter.photos[0][0], true);
  button.append(photo, document.createTextNode(chapter.stop));
  button.onclick = () => playback.go(index);
  find('contents').append(button);
});
find('play').onclick = playback.toggle;
find('back').onclick = () => playback.step(-1);
find('next').onclick = () => playback.step(1);
find('clip').onclick = () => {
  playback.stop();
  const chapter = chapters[current];
  video.poster = mediaPath(chapter.video, true);
  video.src = mediaPath(chapter.video);
  find('clipTitle').textContent = chapter.stop + ' · 现场片段';
  cinema.showModal();
  video.play().catch(() => {});
};
find('dismiss').onclick = () => cinema.close();
cinema.onclose = () => { video.pause(); video.removeAttribute('src'); video.load(); };
document.addEventListener('keydown', event => {
  if (cinema.open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft') playback.step(-1);
  if (event.key === 'ArrowRight') playback.step(1);
});
let touchStart;
find('visual').addEventListener('touchstart', event => {touchStart = event.touches[0];}, {passive:true});
find('visual').addEventListener('touchend', event => {
  if (!touchStart) return;
  const end = event.changedTouches[0];
  const dx = end.clientX - touchStart.clientX;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(end.clientY - touchStart.clientY)) playback.step(dx < 0 ? 1 : -1);
  touchStart = null;
});
document.addEventListener('visibilitychange', () => {if (document.hidden) playback.stop();});
playback.go(0);
