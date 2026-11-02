import { existsSync, lstatSync, readdirSync, realpathSync, rmSync, statfsSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Only disposable copies in the hosted build checkout, after site verification.
export const uploadCleanupTargets = ['rank/dist', 'rank/public', 'content/activities', '.git/lfs/objects']

function inspect(root, file) {
  const rel = relative(root, file)
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('清理路径越界')
  for (let parent = file; parent !== root; parent = dirname(parent)) {
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error(`拒绝处理链接：${parent}`)
  }
  if (!existsSync(file)) return 0
  const info = lstatSync(file)
  if (info.isFile()) return info.size
  if (!info.isDirectory()) throw new Error(`拒绝处理特殊文件：${file}`)
  return readdirSync(file).reduce((sum, name) => sum + inspect(root, resolve(file, name)), 0)
}

export function preparePagesUpload({ root, apply = false, env = process.env, log = console.log }) {
  root = realpathSync(root)
  if (!existsSync(resolve(root, '_site/index.html')) || !existsSync(resolve(root, '_site/rank/index.html'))) {
    throw new Error('先完成网站组装和验收，再准备上传')
  }
  if (apply && (env.GITHUB_ACTIONS !== 'true' || env.RUNNER_ENVIRONMENT !== 'github-hosted'
    || !env.GITHUB_WORKSPACE || realpathSync(env.GITHUB_WORKSPACE) !== root)) {
    throw new Error('仅允许在 GitHub 托管运行机器的当前工作目录清理；本地请使用默认预览模式')
  }
  const siteBytes = inspect(root, resolve(root, '_site'))
  // Validate every target before deleting anything. Never follow directory links.
  const targets = uploadCleanupTargets.map(name => ({ name, file: resolve(root, name), bytes: inspect(root, resolve(root, name)) }))
  let released = 0
  for (const target of targets) {
    if (apply) rmSync(target.file, { recursive: true, force: true })
    released += target.bytes
    log(`${apply ? '已清理临时副本' : '可清理临时副本'} ${target.name}：${(target.bytes / 1024 ** 2).toFixed(1)} MiB`)
  }
  const fs = statfsSync(root)
  const freeBytes = fs.bavail * fs.bsize
  // upload-pages-artifact creates an uncompressed tar in RUNNER_TEMP.
  const requiredBytes = Math.ceil(siteBytes * 1.15) + 256 * 1024 ** 2
  log(`发布目录 ${(siteBytes / 1024 ** 2).toFixed(1)} MiB；${apply ? '已释放' : '可释放'} ${(released / 1024 ** 2).toFixed(1)} MiB；当前可用 ${(freeBytes / 1024 ** 2).toFixed(1)} MiB`)
  if (siteBytes > 1_000_000_000) log('::warning::发布目录超过 GitHub Pages 文档规定的 1 GB，需另行规划原图／视频托管；本步骤保留现有全部公开素材。')
  if (apply && freeBytes < requiredBytes) throw new Error(`上传归档空间不足：需要至少 ${Math.ceil(requiredBytes / 1024 ** 2)} MiB，请检查运行机器磁盘容量`)
  return { siteBytes, released, freeBytes, requiredBytes }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.some(arg => arg !== '--apply')) throw new Error('仅支持 --apply；不加参数仅预览，不清理')
  preparePagesUpload({ root: fileURLToPath(new URL('../', import.meta.url)), apply: args.includes('--apply') })
}
