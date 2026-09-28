import { test, expect } from '@playwright/test'

const fixture = 'http://127.0.0.1:4174/bltbSch_201.github.io/rank/'
const preview = 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'

test('directory, map and search use the same filtered places', async ({ page }) => {
  await page.goto(fixture + 'guide/')
  await expect(page.locator('.place-directory nav a')).toHaveCount(28)
  await expect(page.locator('.atlas-count strong')).toHaveText('4')

  await page.getByLabel('城市筛选').selectOption('测试乙城')
  await expect(page.locator('.place-directory nav a')).toHaveCount(14)
  await expect(page.locator('.atlas-count strong')).toHaveText('2')

  await page.getByRole('searchbox').fill('TEST')
  await expect(page.locator('.place-directory nav a')).toHaveCount(0)
  await expect(page.locator('.atlas-count strong')).toHaveText('0')
  await expect(page.getByText('没有匹配的地点')).toBeVisible()
})

test('published copy reflects current places and update categories', async ({ page }) => {
  await page.goto(preview)
  await expect(page.getByRole('searchbox')).toHaveAttribute('placeholder', '搜索店名、城市或标签…')
  await expect(page.locator('.update-kind').filter({ hasText: '图集更新' }).first()).toBeVisible()
  await expect(page.locator('.update-kind').filter({ hasText: '地图更新' }).first()).toBeVisible()

  await page.goto(preview + 'qa/')
  await expect(page.getByText('榜单会继续更新吗？')).toBeVisible()
  await expect(page.getByText('现在为什么没有店铺？')).toHaveCount(0)
})
