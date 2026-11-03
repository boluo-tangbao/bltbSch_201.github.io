import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { placeDetailHash } from '../../src/utils/search'

const directories = JSON.parse(readFileSync('src/data/shop-directories.json', 'utf8'))
const ids = Object.keys(directories).slice(0, 2)
test.use({ storageState: { cookies: [], origins: [] } })

test('每个地点首次提醒，确认后刷新不重弹，入口可重看并跳转店单', async ({ page }) => {
  await page.goto('guide/' + placeDetailHash(ids[0]))
  const dialog = page.getByRole('dialog', { name: '出发前留意', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('实时营业及库存以店铺为准')
  await page.getByRole('button', { name: '知道了，继续看介绍' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.detail-heading .visit-notices')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.detail-heading h1')).toBeVisible()
  await expect(dialog).toBeHidden()
  await page.locator('.visit-notices-trigger').click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '查看店单与依据 ↓' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.shop-directory').first()).toBeInViewport()
  await page.goto('guide/' + placeDetailHash(ids[1]))
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
})

test('相关提醒变化后再次提示', async ({ page }) => {
  await page.goto('guide/' + placeDetailHash(ids[0]))
  const dialog = page.getByRole('dialog', { name: '出发前留意', exact: true })
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: '知道了，继续看介绍' }).click()
  await page.clock.setFixedTime(new Date('2026-11-02T04:00:00Z'))
  // Stale acknowledgement stands for a previously seen, different reminder.
  await page.evaluate(id => localStorage.setItem(`tangbao-visit-notices-v1:${id}`, 'older reminder'), ids[0])
  await page.reload()
  await expect(dialog).toBeVisible()
})
