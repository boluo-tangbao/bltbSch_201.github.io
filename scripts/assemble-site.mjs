import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const out = resolve(root, '_site')
mkdirSync(out, { recursive: true })
// Preserve tracked assets of the existing personal site; never publish source/data/tests.
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
const extensions = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.avif', '.gif', '.pdf', '.ico', '.woff', '.woff2', '.txt', '.xml'])
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.avif', '.gif', '.ico'])
for (const file of files) {
  if (/^(rank|scripts|docs|\.github)\//.test(file) || file.startsWith('.') || (!extensions.has(extname(file)) && file !== 'CNAME')) continue
  const target = resolve(out, file)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(resolve(root, file), target)
}
// Include the personal site's public image directory in local previews as well.
function copyPublicImages(source, destination) {
  if (!existsSync(source)) return
  mkdirSync(destination, { recursive: true })
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const input = resolve(source, entry.name), target = resolve(destination, entry.name)
    if (entry.isDirectory()) copyPublicImages(input, target)
    else if (entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase())) cpSync(input, target)
  }
}
copyPublicImages(resolve(root, 'images'), resolve(out, 'images'))
cpSync(resolve(root, 'rank/dist'), resolve(out, 'rank'), { recursive: true })
writeFileSync(resolve(out, '.nojekyll'), '')
console.log('Pages 构建完成：原站文件保留，榜单位于 _site/rank/。')
