import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRichText, richTextHtml } from '../src/utils/richText.ts'

test('nested emphasis preserves text, color and font size together', () => {
  assert.deepEqual(parseRichText('[huge]**请输入文本**[/huge]和[red]**流萤**[/red]'), [
    { text: '请输入文本', strong: true, red: false, size: 'huge' },
    { text: '和', strong: false, red: false, size: 'normal' },
    { text: '流萤', strong: true, red: true, size: 'normal' },
  ])
  assert.equal(parseRichText('**[large]寄售[/large]**')[0].size, 'large')
})

test('offline rich text escapes HTML and leaves unsupported markers as text', () => {
  const html = richTextHtml('[red]<img src=x onerror=alert(1)>[/red] **补卡** [unknown]保留[/unknown]')
  assert.ok(html.includes('class="text-red">&lt;img'))
  assert.ok(html.includes('<strong class="">补卡</strong>'))
  assert.ok(html.includes('[unknown]保留[/unknown]'))
  assert.ok(!html.includes('<img'))
  assert.equal(parseRichText('[red]未闭合')[0].text, '[red]未闭合')
})
