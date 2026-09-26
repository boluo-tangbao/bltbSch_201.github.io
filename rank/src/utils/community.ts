import config from '../data/community.json'
export const repoUrl = `https://github.com/${config.repository}`
export const issueUrl = (number: number) => `${repoUrl}/issues/${number}`
export const bilibiliProfileUrl = config.bilibiliProfile
export const feedbackUrl = `${repoUrl}/issues?q=${encodeURIComponent(`is:issue label:${config.feedbackLabel}`)}`
export async function github<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${config.repository}${path}`, {
    headers: { Accept: 'application/vnd.github.text+json' }, signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? '访问较频繁，请稍后刷新；也可以直接前往 GitHub 查看。' : '暂时无法加载，请稍后重试，或前往 GitHub 查看。')
  return response.json()
}
export function suggestionUrl(category: string, title: string, body: string) {
  // Template labels work for ordinary visitors; the labels URL parameter needs write access.
  const query = new URLSearchParams({ template: 'rank-feedback.md', title: `[${category}] ${title.trim()}`, body: `### ${category}\n\n${body.trim()}\n\n---\n来自汤包的逛店手记 QA 与建议页。` })
  return `${repoUrl}/issues/new?${query}`
}
export function readableDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN')
}
