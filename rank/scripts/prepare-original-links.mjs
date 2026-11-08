import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { isVideoCopy } from '../../scripts/video-copies.mjs'

export function prepareOriginalLinks(root, previews) {
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true })
  const links = {}
  const repo = git(['rev-parse', '--show-toplevel']).trim()
  const revision = git(['rev-parse', 'HEAD']).trim()
  const prefix = relative(repo, resolve(root, 'public')).replaceAll('\\', '/') + '/'
  const tracked = new Map(git(['ls-tree', '--full-tree', '-rz', 'HEAD', '--', prefix + 'images/places']).split('\0').filter(Boolean).map(entry => {
    const [meta, path] = entry.split('\t')
    return [path, meta.split(' ')[2]]
  }))
  for (const [path, preview] of Object.entries(previews)) {
    if (path.endsWith('.mp4') && isVideoCopy(resolve(root, 'public', path))) continue
    if (!path.startsWith('images/places/') || !preview.small || !preview.large || !(preview.display || preview.playback)) continue
    const repoPath = prefix + path, sha = tracked.get(repoPath)
    if (!sha) continue
    const bytes = readFileSync(resolve(root, 'public', path))
    const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
    let matches = blob === sha
    if (!matches && path.endsWith('.mp4')) {
      const pointer = git(['show', `${revision}:${repoPath}`])
      matches = pointer.includes('version https://git-lfs.github.com/spec/v1') && pointer.includes(`oid sha256:${createHash('sha256').update(bytes).digest('hex')}`)
    }
    // New or modified uncommitted originals stay local until a committed copy exists.
    if (matches) links[path] = `https://github.com/boluo-tangbao/bltbSch_201.github.io/blob/${revision}/${repoPath.split('/').map(encodeURIComponent).join('/')}`
  }
  writeFileSync(resolve(root, 'src/data/original-links.json'), JSON.stringify(links, null, 2) + '\n')
  console.log(`原件分离：${Object.keys(links).length} 个原件使用 GitHub 固定版本文件入口；未提交原件保留站内访问。`)
  return links
}
