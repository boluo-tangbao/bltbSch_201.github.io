import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
const sharp = createRequire(resolve(root, 'rank/package.json'))('sharp')
mkdirSync(resolve(root, 'images/responsive'), { recursive: true })
for (const [name, widths] of [['akane-background', [960, 1280]], ['anime', [320, 640]], ['art', [320, 640]], ['travel', [320, 640]]]) {
  for (const width of widths) {
    await sharp(resolve(root, `images/${name}.webp`)).resize({ width, withoutEnlargement: true })
      .webp({ quality: name === 'akane-background' ? 72 : 82 })
      .toFile(resolve(root, `images/responsive/${name}-${width}.webp`))
  }
}
// These shelf and homepage cards are about 350px wide on desktop and up to
// 590px on phones in landscape. Keep the existing 1600px candidate for larger DPRs.
export async function prepareCoverVariants(sources) {
  for (const high of sources) {
    const input = resolve(root, high)
    const { width: sourceWidth } = await sharp(input).metadata()
    for (const width of [800, 1200].filter(width => width < sourceWidth)) {
      const destination = high.replace(/(?:-1600)?\.webp$/, `-${width}.webp`)
      await sharp(input).resize({ width }).webp({ quality: 85 }).toFile(resolve(root, destination))
    }
  }
}
await prepareCoverVariants([
  'assets/images/home-covers/art-relit-1600.webp',
  'assets/images/home-covers/anime-relit-1600.webp',
  'assets/lanzhou/698d3d46d6fa6178.webp',
  'assets/hangzhou/media/1795059262390.webp',
])
console.log('已生成首页与旅行封面响应式图片；原图保留。')
