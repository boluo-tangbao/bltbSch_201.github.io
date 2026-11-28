import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { devices, metrics, numberOfRuns } from './config.mjs'

const readJson = file => JSON.parse(readFileSync(file, 'utf8'))
const markdown = value => value.replaceAll('|', '\|').replaceAll('<', '&lt;').replace(/\s+/g, ' ')

function loadReports(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(file => /^lhr-\d+(?:-\d+)?\.json$/.test(file))
    .map(file => readJson(join(dir, file)))
}

function opportunities(reports) {
  const candidates = new Map()
  for (const report of reports) {
    for (const audit of Object.values(report.audits)) {
      if (!Number.isFinite(audit.score) || audit.score >= 1 || !audit.details?.items?.length) continue
      const { LCP = 0, FCP = 0, TBT = 0 } = audit.metricSavings ?? {}
      const time = Math.max(LCP, FCP, TBT, audit.details.overallSavingsMs ?? 0)
      const bytes = audit.details.overallSavingsBytes ?? 0
      if (time <= 0 && bytes <= 0 && audit.id !== 'image-delivery-insight') continue
      const previous = candidates.get(audit.id)
      candidates.set(audit.id, {
        hits: (previous?.hits ?? 0) + 1,
        time: Math.max(previous?.time ?? 0, time),
        text: markdown(audit.title + (audit.displayValue ? '（' + audit.displayValue + '）' : '')),
      })
    }
  }
  return [...candidates.values()].sort((a, b) => b.hits - a.hits || b.time - a.time)
    .slice(0, 2).map(({ text }) => text)
}

export function summarize(output, targets, errors) {
  const lines = ['## Lighthouse CI', '']
  let complete = 0
  let warnings = 0
  let version
  const rows = []
  const advice = []

  for (const device of devices) {
    const dir = join(output, device.id, 'reports')
    const reports = loadReports(dir)
    const groups = Map.groupBy(reports, report => report.requestedUrl)
    const assertionFile = join(dir, 'assertion-results.json')
    const assertions = existsSync(assertionFile) ? readJson(assertionFile) : []
    version ??= reports[0]?.lighthouseVersion

    for (const target of targets) {
      const runs = groups.get(target.url) ?? []
      const validRuns = runs.filter(run => !run.runtimeError && run.configSettings.formFactor === device.id)
      const finalUrls = new Set(validRuns.map(run => run.finalUrl))
      const results = metrics.map(metric => assertions.find(result => {
        const id = result.auditProperty ? result.auditId + ':' + result.auditProperty : result.auditId
        return id === metric.id && finalUrls.has(result.url)
      }))
      const valid = runs.length === numberOfRuns && validRuns.length === numberOfRuns &&
        finalUrls.size === 1 && results.every(result =>
          result?.values.length === numberOfRuns && Number.isFinite(result.actual))

      const failed = valid ? metrics.filter((_, index) => !results[index].passed) : []
      const cells = metrics.map(({ format }, index) => {
        if (!valid) return '—'
        const value = format(results[index].actual)
        return results[index].passed ? value : '**' + value + '**'
      })
      const status = valid ? failed.map(metric => metric.label).join('、') || '达标' : '检测不完整'
      const label = device.name + ' · ' + target.name
      rows.push('| ' + [device.name, markdown(target.name), markdown(target.path || '/'),
        validRuns.length + '/' + numberOfRuns, ...cells, status].join(' | ') + ' |')
      if (valid) complete++
      if (failed.length) {
        warnings++
        if (process.env.GITHUB_ACTIONS === 'true') console.log('::warning::' + label + ' 未达标项目 ' + status)
      }
      if (valid) {
        const findings = opportunities(validRuns)
        if (failed.length || findings.length) {
          const suggestions = failed.map(metric => metric.advice).concat(findings)
          advice.push('- **' + markdown(label) + '**　' + suggestions.join(' '))
        }
      }
    }
  }

  const planned = devices.length * targets.length
  lines.push(
    'Lighthouse ' + (version ?? '未取得版本') + '。已完成 ' + complete + '/' + planned +
      ' 个页面与设备组合，其中 ' + warnings + ' 个组合有指标未达标。',
    '',
    '每项指标取 ' + numberOfRuns + ' 次测试的中位数。目标为 ' + metrics.map(metric =>
      metric.label + ' ' + (metric.assertion === 'minScore' ? '≥' : '≤') + ' ' + metric.format(metric.target)
    ).join('，') + '。',
    '',
    '| 设备 | 页面 | 路径 | 有效运行 | ' + metrics.map(metric => metric.label).join(' | ') + ' | 未达标项目 |',
    '| --- | --- | --- | --- | ' + metrics.map(() => '---:').join(' | ') + ' | --- |',
    ...rows,
    '',
    '### 优化建议',
    '',
    ...(advice.length ? advice : ['本次有效报告未提供可列出的优化建议。']),
  )
  if (errors.length) lines.push('', '### 执行问题', '', ...errors.map(error => '- ' + markdown(error)))
  lines.push('', '各次运行的 HTML、JSON 和断言结果位于 Lighthouse 报告附件。', '')
  return { text: lines.join('\n'), incomplete: complete < planned }
}
