export function activityBilibiliVideos(event) {
 return [...(event.bvid ? [{bvid:event.bvid,page:event.bvidPage||1,title:event.bvidTitle||'现场视频'}] : []), ...(event.bilibiliVideos||[])];
}

export function activityBilibiliUrl(video, player=false) {
 return player ? 'https://player.bilibili.com/player.html?bvid='+encodeURIComponent(video.bvid)+'&page='+video.page+'&autoplay=0'
  : 'https://www.bilibili.com/video/'+encodeURIComponent(video.bvid)+'/?p='+video.page;
}
