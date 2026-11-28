import { spawn } from 'node:child_process'
import { appendFile, mkdir, mkdtemp, readdir, rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { devices, lighthouseConfig, pages } from './config.mjs'
import { summarize } from './report.mjs'

const require = createRequire(import.meta.url)
const outputRoot = resolve('test-results/lighthouse')
await mkdir(outputRoot, { recursive: true })
const output = await mkdtemp(join(outputRoot, 'run-'))

function runLhci(cli, command, cwd) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [cli, command, '--config=lighthouserc.json'], {
      cwd, stdio: 'inherit', windowsHide: true,
    })
    child.once('error', fail)
    child.once('close', (code, signal) => {
      if (code === 0) done()
      else fail(new Error('lhci ' + command + ' 执行失败（' + (signal ?? code) + '）'))
    })
  })
}

let server
const errors = []
let targets = pages
try {
  let base = process.argv[2]
  if (!base) {
    const { previewBase, previewServer } = await import('../preview-site.mjs')
    server = await previewServer(0)
    base = 'http://127.0.0.1:' + server.address().port + previewBase
  }
  const baseUrl = new URL(base)
  if (!baseUrl.pathname.endsWith('/')) baseUrl.pathname += '/'
  targets = pages.map(page => ({ ...page, url: new URL(page.path, baseUrl).href }))
  const packageFile = require.resolve('@lhci/cli/package.json', {
    paths: [resolve(process.env.LHCI_TOOLS_DIR || '.')],
  })
  const cli = resolve(dirname(packageFile), require(packageFile).bin.lhci)

  for (const device of devices) {
    const cwd = join(output, device.id)
    const raw = join(cwd, '.lighthouseci')
    await mkdir(cwd)
    await writeFile(join(cwd, 'lighthouserc.json'),
      JSON.stringify(lighthouseConfig(targets.map(target => target.url), device), null, 2))
    try {
      await runLhci(cli, 'collect', cwd)
    } catch (error) {
      errors.push(device.name + ' ' + error.message)
    }
    if (!existsSync(raw)) continue
    if ((await readdir(raw)).some(file => /^lhr-.*\.json$/.test(file))) {
      try {
        await runLhci(cli, 'assert', cwd)
      } catch (error) {
        errors.push(device.name + ' ' + error.message)
      }
    }
    await rename(raw, join(cwd, 'reports'))
  }
} catch (error) {
  errors.push(error.message)
} finally {
  server?.close()
}

const { text, incomplete } = summarize(output, targets, errors)
await writeFile(join(output, 'summary.md'), text)
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text + '\n')
console.log('Lighthouse 报告位于 ' + output)
if (errors.length || incomplete) {
  console.error(errors.join('\n') || '缺少有效报告或指标，请检查 Lighthouse 输出。')
  process.exitCode = 1
}
