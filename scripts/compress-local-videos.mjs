import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(new URL('../rank/package.json', import.meta.url))
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path
const manifestPath = resolve(root, 'data/video-copies.json')
const copies = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const files = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { cwd: root, encoding: 'utf8' }).split('\0'))].filter(path =>
  /^(content\/activities|rank\/public)\//.test(path) && /\.(mp4|mov)$/i.test(path))
let before = 0, after = 0
for (const file of files) {
  const target = resolve(root, file)
  if (!existsSync(target)) continue
  if (copies[file]?.sha256 === digest(target)) continue
  let archive = resolve(root, '.local-media/video-originals', file)
  // A new recording replacing an existing path gets its own original backup.
  if (copies[file] && existsSync(archive) && digest(target) !== digest(archive)) {
    archive += '.' + digest(target) + '.original'
  }
  if (!existsSync(archive)) {
    mkdirSync(dirname(archive), { recursive: true })
    copyFileSync(target, archive)
    if (digest(archive) !== digest(target)) throw new Error('原件备份校验失败：' + file)
  }
  const temporary = resolve(root, '.local-media/encoded', file.replace(/\.(mp4|mov)$/i, '.mp4'))
  mkdirSync(dirname(temporary), { recursive: true })
  // Existing activity playback copies can be reused without another lossy encode.
  const activityHash = createHash('sha256').update('activity-media-v1:.mp4:').update(readFileSync(archive)).digest('hex').slice(0, 20)
  const cached = resolve(root, 'assets/generated/activities/media', activityHash + '.mp4')
  let cachedInfo = ''
  if (existsSync(cached) && statSync(cached).size > 0) {
    try { execFileSync(ffmpeg, ['-hide_banner', '-i', cached], { stdio: 'pipe' }) }
    catch (error) { cachedInfo = String(error.stderr) }
  }
  const dimensions = cachedInfo.match(/Video: h264[^\n]*? (\d{2,5})x(\d{2,5})/)
  if (dimensions && Math.max(Number(dimensions[1]), Number(dimensions[2])) <= 1280) {
    copyFileSync(cached, temporary)
  } else {
    console.log('压缩：' + file)
    execFileSync(ffmpeg, ['-nostdin', '-v', 'error', '-y', '-threads', '2', '-i', archive,
      '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1',
      '-vf', "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30,setsar=1",
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '27', '-maxrate', '1800k', '-bufsize', '3600k',
      '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', temporary],
    { windowsHide: true, stdio: 'inherit' })
  }
  if (statSync(temporary).size >= 100 * 1024 ** 2) throw new Error('压缩副本仍超过100 MiB：' + file)
  execFileSync(ffmpeg, ['-nostdin', '-v', 'error', '-threads', '2', '-i', temporary, '-f', 'null', '-'],
    { windowsHide: true, stdio: 'pipe' })
  const entry = { sha256: digest(temporary), originalSha256: digest(archive) }
  before += statSync(archive).size
  after += statSync(temporary).size
  renameSync(temporary, target)
  copies[file] = entry
  mkdirSync(dirname(manifestPath), { recursive: true })
  const staged = resolve(root, '.local-media/video-copies.tmp.json')
  writeFileSync(staged, JSON.stringify(copies, null, 2) + '\n')
  renameSync(staged, manifestPath)
  console.log('已备份并替换：' + relative(root, target))
}
console.log('本轮视频：' + (before / 1e6).toFixed(1) + ' MB → ' + (after / 1e6).toFixed(1) + ' MB')
