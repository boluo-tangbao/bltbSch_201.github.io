import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { ShopDirectory } from '../../src/types'
import { mergeShopSources } from '../../src/utils/shopDirectory'

const base = 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const directories: Record<string, ShopDirectory> = JSON.parse(readFileSync('src/data/shop-directories.json', 'utf8'))
const placeIds = ['guangzhou-shop-001', 'shanghai-shop-003', 'shanghai-shop-008']

for (const route of ['', 'guide/']) {
  for (const width of [1440, 390]) {
    test(`${route || 'ranking'} ${width}: regular shops keep evidence only when no social account is shown`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 })
      let checkedAccount = false, checkedOfficialListing = false, checkedPending = false, checkedLimited = false
      for (const placeId of placeIds) {
        await page.goto(`${base}${route}#/place/${placeId}`, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('.shop-directory')).toBeVisible()
        for (const section of await page.locator('.shop-directory-section').all()) {
          const confirmed = section.locator('.shop-directory-confirmed .shop-row')
          await expect(confirmed.filter({ visible: true })).toHaveCount(Math.min(5, await confirmed.count()))
          const expand = section.locator('.shop-directory-confirmed .shop-expand')
          while (await expand.count()) {
            const before = await confirmed.filter({ visible: true }).count()
            expect(await expand.evaluate(button => button.getBoundingClientRect().top >= button.parentElement!.previousElementSibling!.getBoundingClientRect().bottom)).toBe(true)
            await expand.click()
            await expect(confirmed.filter({ visible: true })).toHaveCount(Math.min(before + 5, await confirmed.count()))
          }
        }
        for (const more of await page.locator('.shop-directory-more').all()) {
          await expect(more).toHaveJSProperty('open', false)
          await more.locator('summary').click()
          for (const subgroup of await more.locator('.shop-pending-group').all()) {
            const rows = subgroup.locator('.shop-row')
            await expect(rows.filter({ visible: true })).toHaveCount(Math.min(5, await rows.count()))
            const expand = subgroup.locator('.shop-expand')
            while (await expand.count()) {
              const before = await rows.filter({ visible: true }).count()
              expect(await expand.evaluate(button => button.getBoundingClientRect().top >= button.parentElement!.previousElementSibling!.getBoundingClientRect().bottom)).toBe(true)
              await expand.click()
              await expect(rows.filter({ visible: true })).toHaveCount(Math.min(before + 5, await rows.count()))
            }
          }
        }
        for (const shop of directories[placeId].shops.filter(shop => shop.status !== 'closed')) {
          const row = page.locator('.shop-row').filter({ has: page.getByRole('heading', { name: shop.name, exact: true }) })
          await expect(row).toHaveCount(1)
          await expect(row).toBeVisible()
          if (shop.floor) {
            await expect(row.locator('.shop-row-title .shop-location')).toHaveText(shop.floor)
            await expect(row.locator('.shop-facts dt')).not.toContainText(['位置'])
          }
          if (shop.limited) {
            checkedLimited = true
            if (shop.note) await expect(row.locator('.shop-evidence-note')).toContainText(shop.note)
            continue
          }
          await expect(row.locator('.shop-author-visit')).toHaveCount(0)
          if (shop.accounts?.length) {
            checkedAccount = true
            await expect(row.locator('.shop-evidence-note, .shop-sources, .shop-kind-evidence')).toHaveCount(0)
            await expect(row.locator('.shop-accounts a')).toHaveCount(shop.accounts.length)
          } else {
            if (shop.operatingConfirmation === 'official-listing') checkedOfficialListing = true
            else checkedPending = true
            if (shop.pendingReview?.category === 'history') {
              const history = row.locator('.shop-history-source')
              await expect(history).toBeVisible()
              await expect(history.locator('a')).toHaveAttribute('href', shop.pendingReview.sourceUrl)
              await expect(row.locator('xpath=ancestor::*[@data-pending-category][1]')).toHaveAttribute('data-pending-category', 'history')
            } else if (shop.operatingConfirmation !== 'official-listing') {
              await expect(row.locator('.shop-status')).toHaveText('待验证')
              await expect(row.locator('.shop-history-source')).toHaveCount(0)
            }
            await expect(row.locator('.shop-evidence-note')).toContainText(shop.note!)
            const links = row.locator('.shop-sources').first().locator('a')
            const sources = mergeShopSources(shop)
            await expect(links).toHaveCount(sources.length)
            for (const [index, source] of sources.entries()) {
              await expect(links.nth(index)).toHaveAttribute('href', source.url)
            }
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      expect([checkedAccount, checkedOfficialListing, checkedPending, checkedLimited]).toEqual([true, true, true, true])
      await page.reload({ waitUntil: 'domcontentloaded' })
      for (const section of await page.locator('.shop-directory-section').all()) {
        const rows = section.locator('.shop-directory-confirmed .shop-row')
        await expect(rows.filter({ visible: true })).toHaveCount(Math.min(5, await rows.count()))
      }
      await page.goto(`${base}${route}#/place/guangzhou-shop-001?find=${encodeURIComponent('灵感谷')}`, { waitUntil: 'domcontentloaded' })
      const result = page.locator('.shop-row').filter({ has: page.getByRole('heading', { name: '灵感谷', exact: true }) })
      await expect(result).toBeVisible()
      await expect(result).toBeFocused()
    })
  }
}
