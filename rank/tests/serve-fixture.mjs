import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = fileURLToPath(new URL('../', import.meta.url)), empty = process.argv.includes('--empty'), target = resolve(root, empty ? '.fixture-empty' : '.fixture-app')
mkdirSync(target, { recursive: true })
for (const item of ['src', 'index.html', 'guide', 'qa']) cpSync(resolve(root, item), resolve(target, item), { recursive: true })
mkdirSync(resolve(target, 'public/images/places'), { recursive: true })
cpSync(resolve(root, 'public/favicon.svg'), resolve(target, 'public/favicon.svg'))
const site = JSON.parse(readFileSync(resolve(root, 'src/data/site.json'), 'utf8'))
site.cityColors = { '测试甲城': '#b95b43', '测试乙城': '#507ba2' }
writeFileSync(resolve(target, 'src/data/site.json'), JSON.stringify(site))
const places = Array.from({ length: 28 }, (_, index) => ({
  id: `demo-${index}`, name: index === 0 ? '仅供测试的虚构店铺与很长很长很长的中文名称（演示）' : `虚构店铺 ${index}（演示）`,
  city: index % 2 ? '测试乙城' : '测试甲城', tier: ['hang', 'top', 'above', 'npc', 'bad'][Math.floor(index / 7)], order: index * 10,
  summary: 'TEST 咖啡与陈列，中文短评换行测试。\n这是虚构的自动化测试素材，不代表真实体验。', details: '第一段中文详情。\n第二段体验与理由。<script>不是可执行内容</script>',
  tags: ['测试标签'], cover: index === 0 ? 'images/places/test.svg' : null, gallery: [], visitedAt: index === 0 ? '2026-09' : null, updatedAt: '2026-09-18', published: true,
  location: index < 4 ? { lat: 30 + index * 0.03, lng: 120 + index * 0.03, coordinateSystem: 'wgs84', address: '虚构测试地址，仅用于功能验证' } : null,
}))
places.push({ ...places[0], id: 'hidden', name: '不可见草稿', published: false })
writeFileSync(resolve(target, 'src/data/places.json'), JSON.stringify(empty ? {} : Object.fromEntries(['测试甲城', '测试乙城'].map(city => [city, places.filter(p => p.city === city).map(({ city, ...entry }) => entry)]))))
writeFileSync(resolve(target, 'src/data/updates.json'), JSON.stringify(empty ? [] : [
  { id: 'added-test', placeId: 'demo-0', type: 'added', note: '仅供测试的新增原因', date: '2026-09-18' },
  { id: 'hidden-update', placeId: 'hidden', type: 'added', note: '不可见更新原因', date: '2026-09-18' },
]))
writeFileSync(resolve(target, 'public/images/places/test.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#e4bd74"/><circle cx="300" cy="150" r="85" fill="#628875"/><text x="300" y="165" text-anchor="middle" font-size="40" fill="white">DEMO</text></svg>')
const server = await createServer({ root: target, configFile: false, plugins: [vue()], base: '/bltbSch_201.github.io/rank/', server: { host: '127.0.0.1', port: empty ? 4175 : 4174, strictPort: true } })
await server.listen()
server.printUrls()
