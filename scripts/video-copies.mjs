import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { relative, resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const manifestPath = resolve(root, 'data/video-copies.json')
const copies = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}

export function isVideoCopy(path) {
  const key = relative(root, path).replaceAll('\\', '/')
  return copies[key]?.sha256 === createHash('sha256').update(readFileSync(path)).digest('hex')
}
