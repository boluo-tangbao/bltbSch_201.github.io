export const pages = [
  { name: '首页', path: '' },
  { name: '逛店榜单', path: 'rank/' },
  { name: '商圈地图', path: 'rank/guide/' },
  { name: '城市指南', path: 'rank/cities/' },
  { name: '活动记录', path: 'activities.html' },
  { name: '文体生活', path: 'culture.html' },
  { name: '二次元', path: 'anime.html' },
  { name: '旅行', path: 'travel.html' },
  { name: '广州旅行手记', path: 'guangzhou-travel.html' },
  { name: '日本旅行', path: 'japan-travel.html' },
]

export const devices = [
  { name: '移动端', id: 'mobile', settings: {} },
  { name: '桌面端', id: 'desktop', settings: { preset: 'desktop' } },
]

export const numberOfRuns = 3

export const metrics = [
  {
    id: 'categories:performance', label: 'Performance', assertion: 'minScore', target: 0.9,
    format: value => String(Math.round(value * 100)),
    advice: '查看 HTML 报告中权重较高的性能指标及对应诊断。',
  },
  {
    id: 'largest-contentful-paint', label: 'LCP', assertion: 'maxNumericValue', target: 2500,
    format: value => (value / 1000).toFixed(2) + ' s',
    advice: '在 LCP 阶段明细中确认首屏元素，依次检查资源发现、传输和渲染延迟。',
  },
  {
    id: 'cumulative-layout-shift', label: 'CLS', assertion: 'maxNumericValue', target: 0.1,
    format: value => value.toFixed(3),
    advice: '查看布局偏移元素，为图片和异步内容预留空间，检查字体替换。',
  },
  {
    id: 'total-blocking-time', label: 'TBT', assertion: 'maxNumericValue', target: 200,
    format: value => value.toFixed(1) + ' ms',
    advice: '在主线程诊断中找到最长任务，优先拆分或推迟首屏以外的脚本。',
  },
]

export function lighthouseConfig(urls, device) {
  return {
    ci: {
      collect: {
        url: urls,
        numberOfRuns,
        settings: { onlyCategories: ['performance'], ...device.settings },
      },
      assert: {
        includePassedAssertions: true,
        assertions: Object.fromEntries(metrics.map(({ id, assertion, target }) => [
          id, ['warn', { [assertion]: target, aggregationMethod: 'median' }],
        ])),
      },
    },
  }
}
