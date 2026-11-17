import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const sharp = createRequire(resolve(root, 'rank/package.json'))('sharp')
const records = JSON.parse(readFileSync(resolve(root, 'content/personal-snapshots/records.json'), 'utf8'))

for (const record of records) {
  const original = resolve(root, record.source.archive)
  if (existsSync(original)) {
    const hash = createHash('sha256').update(readFileSync(original)).digest('hex')
    if (hash !== record.source.sha256) throw new Error(`${record.id} 原件与存档指纹不符，请核对素材`)
  }
  for (const [key, size, quality] of [['preview', 480, 86], ['fullImage', 1600, 92]]) {
    const output = resolve(root, record[key])
    if (!existsSync(output)) {
      if (!existsSync(original)) throw new Error(`${record.id} 缺少网页图片 ${record[key]}`)
      mkdirSync(dirname(output), { recursive: true })
      await sharp(original).resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
        .webp({ quality }).toFile(output)
    }
    const metadata = await sharp(output).metadata()
    if (metadata.format !== 'webp' || Math.max(metadata.width, metadata.height) > size) {
      throw new Error(`${record.id} 网页图片规格不符：${record[key]}`)
    }
  }
}
console.log(`个人切片：已检查 ${records.length} 份记录的预览与高清图；原件仅本地保留。`)
