(() => {
  const originalRevision = "475285f4abe0c5389c2b101331d8d79ec0ba6bf2";
  const originalPhotos = {
    "train-platform": "content/pilgrimage/2026-4：杭州/上海西的仿南湖列车3.jpg",
    "1795059261767": "content/pilgrimage/2026-4：杭州/浙江博物馆/1795059261767.jpg",
    "iron-certificate": "content/pilgrimage/2026-4：杭州/浙江博物馆/丹书铁券.jpg",
    "1795059263222": "content/pilgrimage/2026-4：杭州/浙江博物馆/1795059263222.jpg",
    "1795059262659": "content/pilgrimage/2026-4：杭州/浙江博物馆/1795059262659.jpg",
    "1795059262853": "content/pilgrimage/2026-4：杭州/钱塘江+六合寺/1795059262853.jpg",
    "1795059262390": "content/pilgrimage/2026-4：杭州/钱塘江+六合寺/1795059262390.jpg",
    "1795059263136": "content/pilgrimage/2026-4：杭州/钱塘江+六合寺/1795059263136.jpg"
  };

  const groups = [
    {
      period: '上午', place: '上海西站',
      photos: ['train-platform', 'train-number', 'train-interior', 'train-window'],
      video: 'train-clip', videoTitle: '仿南湖列车内的走道',
      picks: [
        ['train-platform', '站台上的仿南湖列车', '深色车身沿着站台排开，车窗下是一整条红色。'],
        ['train-interior', '车窗旁的小桌', '车厢里换成了另一种颜色。浅色窗帘垂在木桌旁，桌上放着一盏绿罩灯。'],
      ],
    },
    {
      period: '白天', place: '浙江省博物馆',
      photos: [
        '1795059261767', 'iron-certificate', '1795059263222', '1795059261662',
        '1795059261691', '1795059261708', '1795059261784', '1795059261945',
        '1795059261979', '1795059261997', '1795059262013', '1795059262038',
        '1795059262064', '1795059262158', '1795059262212', '1795059262231',
        '1795059262306', '1795059262349', '1795059262371', '1795059262414',
        '1795059262534', '1795059262560', '1795059262639', '1795059262659',
        '1795059262684', '1795059262770', '1795059262785', '1795059262805',
        '1795059262874', '1795059262897', '1795059262917', '1795059262941',
        '1795059262961', '1795059263168', '1795059263194', '1795059263303', '1795059263327',
      ],
      picks: [
        ['1795059261767', '一只朱红色的圆盒', '圆盖上的纹样一层叠着一层，光照下来，凸起的部分最先显出颜色。'],
        ['iron-certificate', '丹书铁券上的字', '褐色的铁面上，字迹深浅不一。靠近看，仍能辨出一行行排列的痕迹。'],
        ['1795059263222', '排成几行的古钱', '钱币大小不一，从深褐到灰绿。有的字迹还清楚，有的只剩下浅浅的轮廓。'],
      ],
    },
    {
      period: '白天', place: '六和塔与钱塘江',
      photos: [
        '1795059262853', '1795059262390', '1795059263136', '1795059261746',
        '1795059261960', '1795059262251', '1795059262289', '1795059263347',
      ],
      picks: [
        ['1795059262853', '树梢上的六和塔', '仰起头，塔檐从树梢往上叠，最上面几层已经融进了浅灰色的天。'],
        ['1795059262390', '桥伸进江面的雾色里', '到了江边，连着的钢桁架从画面左边伸出去，远处的江岸只剩一条淡淡的线。'],
      ],
    },
    {
      period: '晚上', place: '街机',
      photos: [], video: 'arcade-clip', videoTitle: '机台前的现场短片',
      picks: [
        ['arcade-clip', '机台亮起来', '晚上留下一小段蓝色灯光里的街机画面。再往后，是杭州对北京国安的现场。'],
      ],
    },
  ];

  const originalPhotoUrl = path => 'https://github.com/boluo-tangbao/bltbSch_201.github.io/blob/' + originalRevision + '/' + path.split('/').map(encodeURIComponent).join('/');
  const get = id => document.getElementById(id);
  const imageUrl = (id, small = false) => `assets/hangzhou/media/${id}${small ? '-s' : ''}.webp`;
  const make = (tag, text = '') => {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  };
  const button = (text, action) => {
    const element = make('button', text);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  };
  const periods = [...new Set(groups.map(group => group.period))];
  const pages = groups.flatMap(group => group.picks.map(([id, title, caption]) => ({ group, id, title, caption })));
  const pictures = groups.flatMap(group => group.photos);
  const totalVideos = groups.filter(group => group.video).length;
  get('album-count').textContent = `${pictures.length} 张照片 · ${totalVideos} 段视频`;

  const viewer = get('viewer');
  const stage = get('stage');
  const storyPhoto = get('story-photo');
  const playButton = get('play');
  let activePage = 0;
  let timer;

  const groupButtons = groups.map(group => {
    const first = pages.findIndex(page => page.group === group);
    const jump = button(group.place, () => selectPage(first));
    const thumbnail = make('img');
    thumbnail.src = imageUrl(pages[first].id, true);
    thumbnail.alt = '';
    thumbnail.loading = 'lazy';
    jump.prepend(thumbnail);
    get('contents').append(jump);
    return jump;
  });
  const periodButtons = periods.map(period => {
    const jump = button(period, () => selectPage(pages.findIndex(page => page.group.period === period)));
    get('periods').append(jump);
    return jump;
  });

  function drawPage() {
    const page = pages[activePage];
    storyPhoto.src = imageUrl(page.id);
    storyPhoto.alt = page.title;
    get('counter').textContent = `${String(activePage + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`;
    get('place').textContent = page.group.place;
    get('scene-title').textContent = page.title;
    get('prose').textContent = page.caption;
    get('story-clip').hidden = !page.group.video;
    get('progress').style.width = `${(activePage + 1) / pages.length * 100}%`;
    get('back').disabled = activePage === 0;
    get('next').disabled = activePage === pages.length - 1;
    groupButtons.forEach((item, index) => item.setAttribute('aria-current', String(page.group === groups[index])));
    periodButtons.forEach((item, index) => item.setAttribute('aria-current', String(page.group.period === periods[index])));
  }

  function stop() {
    clearInterval(timer);
    timer = undefined;
    playButton.textContent = activePage === pages.length - 1 ? '从头播放' : '播放手记';
    playButton.setAttribute('aria-pressed', 'false');
  }

  function selectPage(index) {
    activePage = Math.max(0, Math.min(index, pages.length - 1));
    stop();
    drawPage();
  }

  playButton.addEventListener('click', () => {
    if (timer !== undefined) return stop();
    if (activePage === pages.length - 1) selectPage(0);
    playButton.textContent = '暂停播放';
    playButton.setAttribute('aria-pressed', 'true');
    timer = setInterval(() => {
      activePage += 1;
      drawPage();
      if (activePage === pages.length - 1) stop();
    }, 3500);
  });
  get('back').addEventListener('click', () => selectPage(activePage - 1));
  get('next').addEventListener('click', () => selectPage(activePage + 1));
  get('story').addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    selectPage(activePage + (event.key === 'ArrowRight' ? 1 : -1));
  });
  let swipeStart;
  get('visual').addEventListener('touchstart', event => { swipeStart = event.touches[0]; }, { passive: true });
  get('visual').addEventListener('touchend', event => {
    if (!swipeStart) return;
    const { clientX, clientY } = event.changedTouches[0];
    const dx = clientX - swipeStart.clientX;
    const dy = clientY - swipeStart.clientY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) selectPage(activePage + (dx < 0 ? 1 : -1));
    swipeStart = undefined;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  function mediaFor(group) {
    const media = group.photos.map((id, index) => ({
      id, title: group.picks.find(([pick]) => id === pick)?.[1] ?? `${group.place} · 照片 ${index + 1}`,
    }));
    if (group.video) media.push({ id: group.video, title: group.videoTitle, video: true });
    return media;
  }

  let viewerItems;
  let mediaIndex;
  let trigger;
  function drawMedia(index) {
    stage.querySelector('video')?.pause();
    mediaIndex = Math.max(0, Math.min(index, viewerItems.length - 1));
    const { id, title, video } = viewerItems[mediaIndex];
    const element = make(video ? 'video' : 'img');
    if (video) {
      element.controls = true;
      element.playsInline = true;
      element.preload = 'none';
      element.poster = imageUrl(id);
      element.src = `assets/hangzhou/media/${id}.mp4`;
      element.setAttribute('aria-label', title);
    } else {
      element.alt = title;
      element.src = imageUrl(id);
    }
    stage.replaceChildren(element);
    get('media-title').textContent = title;
    const original = get('original-photo');
    const url = originalPhotos[id];
    original.hidden = !url;
    if (url) original.href = originalPhotoUrl(url);
    else original.removeAttribute('href');
    get('media-count').textContent = `${mediaIndex + 1} / ${viewerItems.length}`;
    get('previous-media').disabled = mediaIndex === 0;
    get('next-media').disabled = mediaIndex === viewerItems.length - 1;
  }

  function openMedia(items, index, origin) {
    stop();
    viewerItems = items;
    trigger = origin;
    drawMedia(index);
    viewer.showModal();
    get('close-viewer').focus();
  }

  get('story-clip').addEventListener('click', event => {
    const items = mediaFor(pages[activePage].group);
    openMedia(items, items.length - 1, event.currentTarget);
  });
  get('previous-media').addEventListener('click', () => drawMedia(mediaIndex - 1));
  get('next-media').addEventListener('click', () => drawMedia(mediaIndex + 1));
  get('close-viewer').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => {
    stage.querySelector('video')?.pause();
    stage.replaceChildren();
    trigger?.focus({ preventScroll: true });
  });
  viewer.addEventListener('keydown', event => {
    if (event.target.tagName === 'VIDEO' || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    drawMedia(mediaIndex + (event.key === 'ArrowRight' ? 1 : -1));
  });

  const albumPeriods = periods.map(period => {
    const section = make('section');
    section.className = 'album-period';
    section.append(make('h3', period));
    const layouts = groups.filter(group => group.period === period).map(group => {
      const items = mediaFor(group);
      const layout = make('div');
      layout.className = 'album-group';
      const heading = make('div');
      heading.className = 'album-group-heading';
      const counts = [group.photos.length && `${group.photos.length} 张照片`, group.video && '1 段视频'].filter(Boolean).join(' · ');
      heading.append(make('h4', group.place), make('span', counts));
      const tiles = make('div');
      tiles.className = 'album-grid';
      const tilesByIndex = items.map(({ id, title, video }, index) => {
        const tile = button('', event => openMedia(items, index, event.currentTarget));
        tile.setAttribute('aria-label', video ? `播放${title}` : `查看${title}`);
        const photo = make('img');
        photo.src = imageUrl(id, true);
        photo.alt = '';
        photo.loading = 'lazy';
        tile.append(photo);
        if (video) tile.append(make('span', '▶ 视频'));
        return tile;
      });
      let expanded = false;
      let filtered = false;
      const toggle = button('', () => { expanded = !expanded; update(filtered); });
      toggle.className = 'album-toggle';
      function update(showPeriod) {
        filtered = showPeriod;
        const showAll = filtered || expanded;
        const visible = showAll ? tilesByIndex : tilesByIndex.slice(0, 3);
        tiles.replaceChildren(...visible);
        toggle.hidden = filtered || items.length <= 3;
        toggle.textContent = expanded ? '收起这组' : `展开全部 ${items.length} 项`;
        toggle.setAttribute('aria-expanded', String(showAll));
      }
      layout.append(heading, tiles, toggle);
      section.append(layout);
      update(false);
      return update;
    });
    get('album-groups').append(section);
    return { period, section, layouts };
  });

  const filters = ['全部', ...periods].map(period => {
    const filter = button(period, () => filterAlbum(period));
    get('filters').append(filter);
    return filter;
  });
  function filterAlbum(period) {
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter.textContent === period)));
    for (const section of albumPeriods) {
      section.section.hidden = period !== '全部' && section.period !== period;
      section.layouts.forEach(update => update(period === section.period));
    }
  }
  filterAlbum('全部');
  selectPage(0);
})();
