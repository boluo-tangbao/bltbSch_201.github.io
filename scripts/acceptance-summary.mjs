import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const directory = new URL('../test-results/acceptance/', import.meta.url)
const read = name => {
  const file = new URL(name, directory)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
}
const resources = read('resources.json'), browser = read('browser.json')
const lines = ['## 网站自动验收', '']
if (resources) {
  lines.push(`- 发布资源：${resources.errors.length ? '未通过' : '通过'}；${resources.files || 0} 个文件，${resources.references || 0} 处引用，${((resources.bytes || 0) / 1024 ** 2).toFixed(1)} MiB。`)
  for (const error of resources.errors.slice(0, 10)) lines.push(`  - ${String(error).replaceAll('`', "'").slice(0, 500)}`)
}
if (browser) {
  const stats = browser.stats
  lines.push(`- 浏览器：${stats.expected} 项通过，${stats.unexpected} 项失败，${stats.skipped} 项跳过。`)
  const visit = suites => {
    for (const suite of suites) {
      for (const spec of suite.specs || []) if (!spec.ok) {
        for (const test of spec.tests || []) for (const result of test.results || []) if (result.error) {
          lines.push(`  - ${test.projectName} / ${spec.title}：${result.error.message.replace(/\u001b\[[0-9;]*m/g, '').replaceAll('`', "'").slice(0, 500)}`)
        }
      }
      visit(suite.suites || [])
    }
  }
  visit(browser.suites || [])
} else lines.push('- 浏览器验收未运行或未生成报告，请查看前面失败步骤。')
lines.push('', '失败时停止发布，原网站保留。报告见本次运行的 site-acceptance-report 附件（保留 7 天）。', '', '外部网站已隔离；不验证第三方登录、实际营业情况或 B 站服务可用性。', '')
const text = lines.join('\n')
writeFileSync(new URL('summary.md', directory), text)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
console.log(text)
