import { test, expect } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve, extname } from 'node:path'
const base = 'http://127.0.0.1:4173/jimmyGu.github.io/rank/'
const api = 'https://api.github.com/repos/boluo-tangbao/jimmyGu.github.io'
mkdirSync('test-results/evidence', { recursive: true })

test('QA submission prepares a public GitHub suggestion, lists real API results, and fits mobile', async ({ page, context }) => {
  let failing = false
  await page.route(`${api}/issues?*`, route => route.fulfill({ status: failing ? 403 : 200, json: failing ? {} : [
    { number: 7, title: '<script>这是纯文本</script>', state: 'closed', created_at: '2026-09-19T00:00:00Z', user: { login: 'tester' } },
  ] }))
  await context.route('https://github.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>GitHub test destination</h1>' }))
  await page.goto(base + 'qa/')
  await expect(page.getByRole('link', { name: '<script>这是纯文本</script>' })).toBeVisible()
  await expect(page.getByText('已关闭', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '前往 GitHub 提交' })).toBeDisabled()
  await page.getByLabel('建议类型').selectOption('推荐店铺')
  await page.getByLabel('一句话说明').fill('杭州的一家小店')
  await page.getByLabel('详细描述').fill('店名 & 街道\n中文推荐')
  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: '前往 GitHub 提交' }).click()
  const popup = await popupPromise; await popup.waitForLoadState()
  const url = new URL(popup.url())
  expect(url.pathname).toBe('/boluo-tangbao/jimmyGu.github.io/issues/new')
  expect(url.searchParams.has('labels')).toBe(false)
  expect(url.searchParams.get('template')).toBe('rank-feedback.md')
  expect(url.searchParams.get('title')).toBe('[推荐店铺] 杭州的一家小店')
  expect(url.searchParams.get('body')).toContain('店名 & 街道\n中文推荐')
  await popup.close()
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/evidence/qa-${width}.png`, fullPage: true })
  }
  failing = true; await page.getByRole('button', { name: '刷新建议' }).click()
  await expect(page.getByRole('alert')).toContainText('访问较频繁')
  failing = false; await page.getByRole('button', { name: '刷新建议' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText('本地预览不计入访问')).toBeVisible()
})

test('bottom guestbook supports direct link, latest-first pages, empty state and retry', async ({ page }) => {
  let failing = false, empty = false
  await page.route(`${api}/issues/1`, route => route.fulfill({ json: { comments: empty ? 0 : 31 } }))
  await page.route(`${api}/issues/1/comments?*`, route => {
    const older = new URL(route.request().url()).searchParams.get('page') === '1'
    return route.fulfill({ status: failing ? 500 : 200, json: empty || failing ? [] : [
      { id: older ? 1 : 31, body_text: older ? '更早的留言' : '<img onerror="alert(1)">保持纯文本', created_at: '2026-09-19T00:00:00Z', user: { login: 'visitor' } },
    ] })
  })
  await page.goto(base + '#guestbook')
  await expect(page.getByRole('heading', { name: '路过，留句话' })).toBeInViewport()
  await expect(page.locator('.comment-list li')).toHaveCount(1)
  await expect(page.locator('.comment-list img')).toHaveCount(0)
  await expect(page.getByRole('link', { name: '使用 GitHub 留言' })).toHaveAttribute('href', 'https://github.com/boluo-tangbao/jimmyGu.github.io/issues/1#new_comment_field')
  await page.getByRole('button', { name: '加载更早的留言' }).click()
  await expect(page.locator('.comment-list li')).toHaveCount(2)
  await expect(page.locator('.comment-list li').last()).toContainText('更早的留言')
  failing = true; await page.getByRole('button', { name: '刷新留言' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  failing = false; empty = true; await page.getByRole('button', { name: '刷新留言' }).click()
  await expect(page.getByText('还没有留言，第一句话留给你。')).toBeVisible()
  await page.setViewportSize({ width: 375, height: 900 })
  await page.locator('#guestbook').screenshot({ path: 'test-results/evidence/guestbook-mobile.png' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('production counter loads once per page and fails honestly when service is blocked', async ({ page }) => {
  const production = 'https://boluo-tangbao.github.io/jimmyGu.github.io/rank/'
  await page.route('https://boluo-tangbao.github.io/**', route => {
    let file = new URL(route.request().url()).pathname.replace('/jimmyGu.github.io/rank/', '')
    if (!file || file.endsWith('/')) file += 'index.html'
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream'
    return route.fulfill({ contentType: mime, body: readFileSync(resolve('dist', file)) })
  })
  await page.route(`${api}/**`, route => route.fulfill({ json: route.request().url().endsWith('/issues/1') ? { comments: 0 } : [] }))
  let calls = 0, failing = false
  await page.route('https://busuanzi.ibruce.info/**', route => {
    calls++
    return failing ? route.abort() : route.fulfill({ contentType: 'text/javascript', body: `document.getElementById('busuanzi_value_site_pv').textContent='${calls}'` })
  })
  await page.goto(production)
  await expect(page.locator('.visit-counter')).toContainText('累计访问 1 次')
  await page.getByRole('searchbox').fill('筛选不计数')
  expect(calls).toBe(1)
  await page.reload()
  await expect(page.locator('.visit-counter')).toContainText('累计访问 2 次')
  await page.getByRole('link', { name: 'QA 与建议', exact: true }).click()
  await expect(page.locator('.visit-counter')).toContainText('累计访问 3 次')
  failing = true
  await page.reload()
  await expect(page.locator('.visit-counter')).toContainText('访问统计暂不可用')
  await expect(page.getByText('累计访问', { exact: false })).not.toBeVisible()
})
