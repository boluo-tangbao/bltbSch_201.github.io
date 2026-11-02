import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { resolve, relative, dirname, extname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { publishedRankAssets } from '../rank/scripts/published-assets.mjs'
import { shopSourceUrl } from '../rank/src/utils/shopSourceUrl.ts'

export function validatePublishedSite({ siteRoot, siteBase = '/bltbSch_201.github.io/', rankAssets = [], sourceUrls = [], originalLinks = {}, budget = 900 * 1024 ** 2 }) {
  siteRoot = resolve(siteRoot)
  siteBase = siteBase.replace(/\/?$/, '/')
  const origin = 'http://acceptance.local', errors = [], externalHosts = new Set(), files = []
  let bytes = 0, references = 0
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const file = resolve(dir, name), stat = lstatSync(file)
      if (stat.isSymbolicLink()) { errors.push(`发布目录不应含链接：${relative(siteRoot, file)}`); continue }
      if (stat.isDirectory()) walk(file)
      else { files.push(file); bytes += stat.size }
    }
  }
  if (!existsSync(siteRoot)) return { errors: ['缺少 _site 发布目录，请先构建并组装'], bytes, files: 0, references, externalHosts: [] }
  walk(siteRoot)
  function check(raw, context, base = origin + siteBase) {
    if (!raw || raw.startsWith('#')) return
    const url = new URL(raw.replaceAll('&amp;', '&'), base)
    if (!['http:', 'https:'].includes(url.protocol)) return
    if (url.origin !== origin) { externalHosts.add(url.hostname); return }
    references++
    const pathname = decodeURIComponent(url.pathname)
    if (!pathname.startsWith(siteBase)) { errors.push(`${context}：地址未包含网站前缀 ${raw}`); return }
    let file = resolve(siteRoot, pathname.slice(siteBase.length)), rel = relative(siteRoot, file)
    if (rel.startsWith('..') || isAbsolute(rel)) { errors.push(`${context}：地址越界 ${raw}`); return }
    if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html')
    if (!existsSync(file)) errors.push(`${context}：文件不存在 ${raw}`)
  }
  for (const page of ['index.html', 'activities.html', 'rank/index.html', 'rank/guide/index.html', 'rank/qa/index.html', 'rank/updates/index.html']) check(page, '页面入口')
  for (const file of files) {
    const ext = extname(file), rel = relative(siteRoot, file).replaceAll('\\', '/')
    const base = origin + siteBase + rel
    if (!['.html', '.css', '.js'].includes(ext)) continue
    let text = readFileSync(file, 'utf8')
    const refs = []
    if (ext === '.html') {
      text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      for (const m of text.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)) refs.push(m[1])
      for (const m of text.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) for (const item of m[1].split(',')) refs.push(item.trim().split(/\s+/)[0])
    } else if (ext === '.css') {
      for (const m of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) refs.push(m[1])
    } else {
      for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\(\s*)["'](\.[^"']+)["']/g)) refs.push(m[1])
    }
    for (const ref of refs) {
      try { check(ref, rel, base) } catch (error) { errors.push(`${rel}：无效地址 ${ref}（${error.message}）`) }
    }
  }
  for (const path of rankAssets) check('rank/' + path.split('/').map(encodeURIComponent).join('/'), '榜单媒体清单')
  for (const [path, url] of Object.entries(originalLinks)) {
    const parsed = new URL(url)
    if (parsed.origin !== 'https://github.com' || !/^\/boluo-tangbao\/bltbSch_201.github.io\/blob\/[a-f0-9]{40}\/rank\/public\//.test(parsed.pathname)
      || !decodeURIComponent(parsed.pathname).endsWith('/rank/public/' + path)) errors.push(`原件固定版本入口无效：${path}`)
  }
  for (const url of sourceUrls) {
    const routed = shopSourceUrl(url, originalLinks)
    const prefix = 'https://boluo-tangbao.github.io/bltbSch_201.github.io/'
    try { check(routed.startsWith(prefix) ? origin + siteBase + routed.slice(prefix.length) : routed, '店铺依据出处') }
    catch (error) { errors.push(`店铺依据地址无效：${url}（${error.message}）`) }
  }
  if (bytes > budget) errors.push(`发布目录 ${(bytes / 1024 ** 2).toFixed(1)} MiB，超过验收预算 ${(budget / 1024 ** 2).toFixed(0)} MiB`)
  return { errors, bytes, files: files.length, references, externalHosts: [...externalHosts].sort() }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const reportDir = resolve(root, 'test-results/acceptance')
  // Clear only this generated report directory so an old browser pass cannot
  // appear in the report for a new failed resource check.
  for (const path of [resolve(root, 'test-results'), reportDir]) {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error('拒绝清理链接形式的验收报告目录')
  }
  if (relative(root, reportDir).replaceAll('\\', '/') !== 'test-results/acceptance') throw new Error('验收报告路径越界')
  rmSync(reportDir, { recursive: true, force: true })
  mkdirSync(reportDir, { recursive: true })
  let result
  try {
    const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
    const originalLinks = json('rank/src/data/original-links.json')
    result = validatePublishedSite({ siteRoot: resolve(root, '_site'), siteBase: process.env.SITE_BASE || '/bltbSch_201.github.io/', originalLinks,
      rankAssets: publishedRankAssets({ places: json('rank/src/data/places.json'), mediaPreviews: json('rank/src/data/media-previews.json'), portraitPreviews: json('rank/src/data/portrait-previews.json'), characters: json('rank/public/characters.json'), originalLinks }),
      sourceUrls: Object.values(json('rank/src/data/shop-directories.json')).flatMap(dir => dir.shops.flatMap(shop => [...shop.sources, ...(shop.kindSources || [])].map(s => s.url).filter(Boolean))),
    })
  } catch (error) { result = { errors: [error.stack || error.message] } }
  writeFileSync(resolve(reportDir, 'resources.json'), JSON.stringify(result, null, 2))
  const report = `# 最终发布目录验收\n\n${result.errors.length ? '未通过，停止本次发布。' : '通过。'}\n\n检查 ${result.files || 0} 个文件、${result.references || 0} 处站内引用；发布体积 ${((result.bytes || 0) / 1024 ** 2).toFixed(1)} MiB。\n\n${result.errors.map(e => '- ' + e).join('\n')}\n\n外部依赖 ${(result.externalHosts || []).length} 个域名已记录在 resources.json，不验证登录和第三方服务可用性。\n`
  writeFileSync(resolve(reportDir, 'resources.md'), report)
  console.log(report)
  if (result.errors.length) process.exitCode = 1
}
