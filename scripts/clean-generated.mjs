import { execFileSync } from 'node:child_process'
import { lstatSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)))
const args = new Set(process.argv.slice(2))
for (const arg of args) {
  if (!['--apply', '--cache'].includes(arg)) throw new Error(`未知参数：${arg}`)
}
const targets = [
  '_site', 'rank/dist',
  'rank/.fixture-app', 'rank/.fixture-empty',
  'test-results', 'rank/test-results',
  'playwright-report', 'rank/playwright-report',
  'rank/.npm-cache', 'rank/node_modules/.vite',
]
if (args.has('--cache')) targets.push(
  'assets/generated', 'images/anime/event-web',
  'data/anime-events.json', 'data/activities.json',
  'rank/public/images/previews', 'rank/public/characters.json',
  'rank/src/data/media-previews.json', 'rank/src/data/portrait-previews.json',
)

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', windowsHide: true })
  .split('\0').filter(Boolean)
function stat(file) {
  try { return lstatSync(file) }
  catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
function checkPath(file) {
  const rel = relative(root, file)
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`清理路径越界：${file}`)
  for (let current = file; current !== root; current = dirname(current)) {
    if (stat(current)?.isSymbolicLink()) throw new Error(`拒绝清理链接路径：${current}`)
  }
}
function bytes(file) {
  checkPath(file)
  const info = stat(file)
  if (!info) return 0
  if (info.isFile()) return info.size
  if (!info.isDirectory()) throw new Error(`拒绝清理特殊文件：${file}`)
  return readdirSync(file).reduce((sum, name) => sum + bytes(resolve(file, name)), 0)
}
// 先检查全部目标，遇到受版本管理的文件或目录链接时不执行清理。
const entries = targets.map(name => {
  if (tracked.some(file => file === name || file.startsWith(`${name}/`))) throw new Error(`目录内有受版本管理的文件，拒绝清理：${name}`)
  const file = resolve(root, name)
  return { name, file, size: bytes(file), exists: !!stat(file) }
}).filter(entry => entry.exists)

let total = 0
for (const { name, file, size } of entries) {
  if (args.has('--apply')) {
    checkPath(file)
    rmSync(file, { recursive: true, force: true })
  }
  total += size
  console.log(`${args.has('--apply') ? '已清理' : '可清理'} ${name} · ${(size / 1024 ** 2).toFixed(2)} MiB`)
}
console.log(`${args.has('--apply') ? '已释放' : '预计释放'} ${(total / 1024 ** 3).toFixed(3)} GiB`)
if (!args.has('--apply')) console.log('当前仅查看；加 --apply 执行清理，加 --cache 同时清理可重新生成的媒体缓存。')
