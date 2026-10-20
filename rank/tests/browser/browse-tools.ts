import type { Page } from '@playwright/test'

export async function openMobileTools(page: Page) {
  const toggle = page.locator('.mobile-tools-toggle')
  if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
}
