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
console.log('已生成首页响应式图片；原图保留。')
