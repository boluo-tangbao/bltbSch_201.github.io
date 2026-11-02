import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { prepareOriginalLinks } from '../scripts/prepare-original-links.mjs'

test('external original links pin matching committed photos and LFS bytes; changed, new and incomplete media stay local', t => {
  const repo = mkdtempSync(join(tmpdir(), 'original-links-'))
  t.after(() => rmSync(repo, { recursive: true, force: true }))
  const root = join(repo, 'rank'), publicRoot = join(root, 'public')
  mkdirSync(join(publicRoot, 'images/places'), { recursive: true })
  mkdirSync(join(root, 'src/data'), { recursive: true })
  const git = args => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true })
  git(['init', '--quiet'])
  const photo = 'images/places/广州 空格 #.jpg', video = 'images/places/movie.mp4'
  const videoBytes = Buffer.from('original video bytes')
  const sha256 = createHash('sha256').update(videoBytes).digest('hex')
  writeFileSync(join(publicRoot, photo), 'original photo')
  writeFileSync(join(publicRoot, video), `version https://git-lfs.github.com/spec/v1\noid sha256:${sha256}\nsize ${videoBytes.length}\n`)
  git(['add', '.'])
  git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'fixture'])
  writeFileSync(join(publicRoot, video), videoBytes)
  const preview = { small: 'images/previews/s.webp', large: 'images/previews/l.webp', display: 'images/previews/d.webp' }
  const previews = { [photo]: preview, [video]: { ...preview, playback: 'images/previews/play.mp4' } }
  const result = prepareOriginalLinks(root, previews)
  const revision = git(['rev-parse', 'HEAD']).trim()
  assert.equal(result[photo], `https://github.com/boluo-tangbao/bltbSch_201.github.io/blob/${revision}/rank/public/images/places/${encodeURIComponent('广州 空格 #.jpg')}`)
  assert.ok(result[video].includes(`/blob/${revision}/rank/public/`))
  writeFileSync(join(publicRoot, photo), 'modified photo')
  writeFileSync(join(publicRoot, video), 'different video')
  writeFileSync(join(publicRoot, 'images/places/new.jpg'), 'new photo')
  assert.deepEqual(prepareOriginalLinks(root, { ...previews, 'images/places/new.jpg': preview }), {})
  writeFileSync(join(publicRoot, photo), 'original photo')
  assert.deepEqual(prepareOriginalLinks(root, { [photo]: { small: preview.small } }), {})
})
