import { test, expect } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { flattenPlaces } from '../../src/utils/model'
import { placeDetailHash } from '../../src/utils/search'

test('Night panels cover comparison, atlas, directory, detail and dialogs', async ({ page, baseURL }) => {
  const base = baseURL!
  expect(new URL(base).hostname).toBe('127.0.0.1')
  const places = flattenPlaces(JSON.parse(readFileSync('src/data/places.json', 'utf8'))).filter(p => p.published)
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort())
  const noLightPanels = async () => {
    const light = await page.evaluate(() => [...document.querySelectorAll('body *')].flatMap(el => {
      if (!(el instanceof HTMLElement) || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || !el.getBoundingClientRect().width) return []
      // Photos, artwork, search highlights and the tier-color legend retain their own colors.
      if (el.matches('img,canvas,video,mark,.criteria-scale i')) return []
      const css = getComputedStyle(el)
      const colors = [css.backgroundColor, ...(css.backgroundImage.match(/rgba?\([^)]+\)/g) || [])]
      const pale = colors.find(color => {
        const rgb = color.match(/[\d.]+/g)?.map(Number)
        return rgb && (rgb[3] === undefined || rgb[3] >= 0.95) && Math.min(...rgb.slice(0, 3)) >= 175
      })
      return pale ? [`${el.tagName.toLowerCase()}.${el.className}: ${pale}`] : []
    }))
    expect([...new Set(light)], 'Night 中不应残留浅色界面底板').toEqual([])
  }
  mkdirSync('test-results/evidence', { recursive: true })
  await page.goto(base)
  await page.locator('.sc-launcher').click()
  await page.locator('#sc-theme-slot').getByRole('button', { name: 'Night version', exact: true }).click()
  await page.mouse.move(0, 0)
  await page.keyboard.press('Escape')
  await page.addLocatorHandler(page.locator('#site-console.sc-open'), async () => { await page.mouse.move(0, 0); await page.keyboard.press('Escape') })
  for (const width of [page.viewportSize()!.width]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(base + 'guide/')
    await expect(page.locator('.atlas-heading')).toBeVisible()
    await expect(page.locator('.directory-heading')).toHaveCSS('background-color', 'rgb(65, 79, 56)')
    await noLightPanels()
    await page.mouse.move(0, 0)
    await expect(page.locator('.sc-panel')).toBeHidden()
    await page.screenshot({ path: `test-results/evidence/night-guide-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: /^商圈对比/ }).click()
    const dialog = page.getByRole('dialog', { name: '商圈对比', exact: true })
    for (const place of places.slice(0, 2)) await dialog.locator('.compare-candidates').getByRole('button', { name: place.name + ' ' + place.city, exact: true }).click()
    await dialog.getByRole('button', { name: '查看对比 ↓' }).click()
    await expect(dialog.locator('.compare-table thead th').first()).toHaveCSS('background-color', 'rgb(32, 41, 37)')
    await expect(dialog.locator('.compare-table tbody th').first()).toHaveCSS('color', 'rgb(228, 234, 219)')
    await noLightPanels()
    await dialog.locator('.compare-table-scroll').screenshot({ path: `test-results/evidence/night-compare-${width}.png` })
    await dialog.getByRole('button', { name: '清空', exact: true }).click()
    await page.keyboard.press('Escape')
  }
  await page.goto(base + 'guide/' + placeDetailHash(places.find(p => p.gallery.length && p.visitedAt)!.id))
  await expect(page.locator('.detail-heading h1')).toBeVisible()
  const notices = page.getByRole('button', { name: '知道了，继续看介绍' })
  if (await notices.isVisible()) await notices.click()
  await page.locator('.detail-timeliness > summary').click()
  await expect(page.locator('.detail-date-grid dd').first()).toHaveCSS('color', 'rgb(228, 234, 219)')
  await noLightPanels()
  await page.mouse.move(0, 0)
  await expect(page.locator('.sc-panel')).toBeHidden()
  await page.locator('.detail-heading').screenshot({ path: 'test-results/evidence/night-detail.png' })
  await page.getByRole('button', { name: '分享地点', exact: true }).click()
  await expect(page.locator('.public-share-dialog')).toBeVisible()
  await noLightPanels()
  await page.keyboard.press('Escape')
  for (const route of ['qa/', 'updates/', 'route/']) {
    await page.goto(base + route)
    await noLightPanels()
  }
  await page.goto(base)
  await page.locator('.trip-plan-entry').getByRole('button', { name: '开始选店', exact: true }).click()
  await page.locator('.trip-plan-add.is-icon-only').first().click()
  await page.getByRole('button', { name: '查看清单', exact: true }).click()
  await expect(page.locator('.trip-plan-dialog')).toBeVisible()
  await noLightPanels()
  await page.getByRole('button', { name: '关闭想逛清单', exact: true }).click()
  await page.removeLocatorHandler(page.locator('#site-console.sc-open'))
  if (page.viewportSize()!.width <= 900) await page.locator('.sc-launcher').click()
  else await page.locator('.sc-launcher').hover()
  await expect(page.locator('.sc-panel')).toBeVisible()
  await noLightPanels()
})
