import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const rankRoot = resolve(scriptDir, '..')
const repoRoot = resolve(rankRoot, '..')
const placesPath = resolve(rankRoot, 'src/data/places.json')
const updatesPath = resolve(rankRoot, 'src/data/updates.json')
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

function readBasePlaces() {
  const baseRevision = process.env.RANK_BASE_SHA || 'HEAD'
  if (/^0+$/.test(baseRevision)) return {}
  const result = spawnSync('git', ['-c', `safe.directory=${repoRoot.replaceAll('\\', '/')}`, 'show', `${baseRevision}:rank/src/data/places.json`], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) throw new Error(`无法读取 Git 基准版本 ${baseRevision} 中的 places.json：${result.stderr.trim()}`)
  return JSON.parse(result.stdout)
}

function flattenPlaces(groups) {
  return Object.values(groups).flat()
}

try {
  const previous = new Map(flattenPlaces(readBasePlaces()).map(place => [place.id, place]))
  const groups = JSON.parse(readFileSync(placesPath, 'utf8'))
  const places = flattenPlaces(groups)
  const updates = JSON.parse(readFileSync(updatesPath, 'utf8'))
  const movedIds = places
    .filter(place => {
      const before = previous.get(place.id)
      return place.published && before?.published && place.tier === before.tier && place.order !== before.order
    })
    .map(place => place.id)
    .sort()

  if (!movedIds.length) {
    console.log('没有检测到已发布条目的档内顺序调整。')
  } else {
    for (const place of places) {
      if (movedIds.includes(place.id)) place.updatedAt = today
    }
    const revision = (process.env.GITHUB_SHA || process.env.RANK_BASE_SHA || 'local').slice(0, 12)
    const id = `ranking-order-${today.replaceAll('-', '')}-${revision}`
    const update = {
      id,
      date: today,
      type: 'ranking-change',
      placeIds: movedIds,
      note: '档内顺序调整。',
    }
    const index = updates.findIndex(item => item.id === id)
    if (index === -1) updates.push(update)
    else updates[index] = update
    writeFileSync(placesPath, `${JSON.stringify(groups, null, 2)}\n`)
    writeFileSync(updatesPath, `${JSON.stringify(updates, null, 2)}\n`)
    console.log(`已为 ${movedIds.length} 个条目生成排名调整记录（${today}）。`)
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
