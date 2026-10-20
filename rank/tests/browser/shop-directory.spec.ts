import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { ShopDirectory } from '../../src/types'

const base = 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const directories: Record<string, ShopDirectory> = JSON.parse(readFileSync('src/data/shop-directories.json', 'utf8'))
const placeIds = ['guangzhou-shop-001', 'shanghai-shop-003']

for (const route of ['', 'guide/']) {
  for (const width of [1440, 390]) {
    test(`${route || 'ranking'} ${width}: regular shops keep evidence only when no social account is shown`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 })
      let checkedAccount = false, checkedOfficialListing = false, checkedPending = false, checkedLimited = false
      for (const placeId of placeIds) {
        await page.goto(`${base}${route}#/place/${placeId}`)
        await expect(page.locator('.shop-directory')).toBeVisible()
        for (const more of await page.locator('.shop-directory-more').all()) {
          await expect(more).toHaveJSProperty('open', false)
          await more.locator('summary').click()
        }
        for (const shop of directories[placeId].shops.filter(shop => shop.status !== 'closed')) {
          const row = page.locator('.shop-row').filter({ has: page.getByRole('heading', { name: shop.name, exact: true }) })
          await expect(row).toHaveCount(1)
          if (shop.limited) {
            checkedLimited = true
            if (shop.note) await expect(row.locator('.shop-evidence-note')).toContainText(shop.note)
            continue
          }
          if (shop.accounts?.length) {
            checkedAccount = true
            await expect(row.locator('.shop-evidence-note, .shop-sources, .shop-kind-evidence')).toHaveCount(0)
            await expect(row.locator('.shop-accounts a')).toHaveCount(shop.accounts.length)
          } else {
            if (shop.operatingConfirmation === 'official-listing') checkedOfficialListing = true
            else checkedPending = true
            await expect(row.locator('.shop-evidence-note')).toContainText(shop.note!)
            const links = row.locator('.shop-sources').first().locator('a')
            await expect(links).toHaveCount(shop.sources.length)
            for (const [index, source] of shop.sources.entries()) {
              await expect(links.nth(index)).toHaveAttribute('href', source.url)
            }
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      expect([checkedAccount, checkedOfficialListing, checkedPending, checkedLimited]).toEqual([true, true, true, true])
    })
  }
}
