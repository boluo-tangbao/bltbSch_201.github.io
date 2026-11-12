import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { flattenPlaces } from '../../src/utils/model'
import { comparisonFacts, comparisonRows } from '../../src/utils/placeComparison'
import { placeDetailHash } from '../../src/utils/search'

const places = flattenPlaces(JSON.parse(readFileSync('src/data/places.json', 'utf8'))).filter(p => p.published)
const directories = JSON.parse(readFileSync('src/data/shop-directories.json', 'utf8'))
const sample = places.slice(0, 4)
test.beforeEach(async ({ page, context, baseURL }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort())
  // A retained mouse position can open the hover console after navigation.
  // Dismiss it normally before comparison actions; console interactions have their own tests.
  await page.addLocatorHandler(page.locator('#site-console.sc-open'), async () => {
    await page.mouse.move(0, 0)
    await page.keyboard.press('Escape')
  })
})

test('商圈对比支持筛选、三项上限、逐行数据、差异筛选及跨页记忆', async ({ page }) => {
  await page.goto('./')
  const launch = page.getByRole('button', { name: /^商圈对比/ })
  await launch.click()
  const dialog = page.getByRole('dialog', { name: '商圈对比', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeFocused()
  for (const place of sample.slice(0, 3)) await dialog.locator('.compare-candidates').getByRole('button', { name: place.name + ' ' + place.city, exact: true }).click()
  await dialog.locator('.compare-candidates').getByRole('button', { name: sample[3]!.name + ' ' + sample[3]!.city, exact: true }).click()
  await expect(dialog.getByText('最多对比 3 个商圈，请先移除一个。')).toBeVisible()
  await dialog.getByRole('button', { name: '查看对比 ↓' }).click()
  const table = dialog.getByRole('table')
  await expect(table.getByRole('columnheader')).toHaveCount(4)
  await expect(table.getByRole('rowheader', { name: /待核|位置|地点/ })).toHaveCount(0)
  const facts = comparisonFacts(sample[0]!, directories[sample[0]!.id])
  await expect(table.locator('.compare-address').first()).toHaveText(`地点：${facts.address}`)
  await expect(table.getByRole('row', { name: /^已确认常规店/ }).getByRole('cell').first()).toHaveText(facts.regular)
  const differentRows = comparisonRows.filter(row => new Set(sample.slice(0, 3).map(place => comparisonFacts(place, directories[place.id])[row.key])).size > 1).length
  await dialog.getByRole('checkbox', { name: '只看不同项' }).check()
  await expect(table.locator('tbody tr')).toHaveCount(differentRows)
  await expect(table.locator('.compare-address')).toHaveCount(3)
  await expect(table.locator('.compare-address').first()).toHaveText(`地点：${facts.address}`)
  await dialog.getByRole('checkbox', { name: '只看不同项' }).uncheck()
  await expect(table.locator('tbody tr')).toHaveCount(comparisonRows.length)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (page.viewportSize()!.width < 800) {
    const scroll = dialog.locator('.compare-table-scroll')
    await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth })
    const left = await table.locator('tbody th').first().boundingBox()
    const region = await scroll.boundingBox()
    expect(Math.abs(left!.x - region!.x)).toBeLessThan(3)
    await scroll.evaluate(el => { el.scrollLeft = 0 })
  }
  await page.screenshot({ path: `../test-results/place-comparison/compare-${page.viewportSize()!.width}.png` })
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(launch).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await page.goto('guide/')
  await page.getByRole('button', { name: /^商圈对比/ }).click()
  await expect(dialog.getByRole('table').getByRole('columnheader')).toHaveCount(4)
  await dialog.getByRole('button', { name: `移除${sample[2]!.name}` }).click()
  await expect(dialog.getByRole('table').getByRole('columnheader')).toHaveCount(3)
  await dialog.getByRole('button', { name: '更换商圈' }).click()
  await dialog.getByRole('searchbox', { name: '搜索对比商圈' }).fill('不可能匹配的名字')
  await expect(dialog.getByText('没有匹配商圈，试试其他关键词。')).toBeVisible()
  await dialog.getByRole('button', { name: '清空', exact: true }).click()
  await expect(dialog.getByRole('table')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.reload()
  await page.getByRole('button', { name: /^商圈对比/ }).click()
  await expect(dialog.getByText('已选 0 / 3')).toBeVisible()
})

test('详情对比预选当前商圈，关闭后仍可阅读并打开详情链接', async ({ page }) => {
  const place = sample[0]!
  await page.goto('guide/' + placeDetailHash(place.id))
  await page.getByRole('button', { name: /^商圈对比/ }).click()
  const dialog = page.getByRole('dialog', { name: '商圈对比', exact: true })
  await expect(dialog.getByRole('button', { name: `移除${place.name}` })).toBeVisible()
  const other = sample[1]!
  await dialog.locator('.compare-candidates').getByRole('button', { name: other.name + ' ' + other.city, exact: true }).click()
  await dialog.getByRole('button', { name: '查看对比 ↓' }).click()
  await dialog.getByRole('link', { name: '查看详情 ↗', exact: true }).nth(1).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.detail-heading h1')).toHaveText(other.name)
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})
