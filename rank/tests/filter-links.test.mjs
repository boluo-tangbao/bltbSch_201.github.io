import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filtersFromSearch, filterShareUrl, urlWithFilters } from '../src/utils/filterLinks.ts'

test('filter links preserve Unicode, spaces and literal punctuation without including a selected place', () => {
  const filters = { city: '上海', tag: '少女乐队', query: 'HIPPIHO & + # 乐器' }
  const url = new URL(filterShareUrl('https://example.com/repo/rank/guide/?tracking=old#/place/a', filters))
  assert.equal(url.pathname, '/repo/rank/guide/')
  assert.equal(url.hash, '')
  assert.equal(url.searchParams.has('tracking'), false)
  assert.deepEqual(filtersFromSearch(url.search), filters)
})

test('explicit empty filters override saved state while unrelated URL parameters do not', () => {
  assert.equal(filtersFromSearch('?utm_source=test'), null)
  assert.deepEqual(filtersFromSearch('?filters=1'), { city: '', tag: '', query: '' })
  assert.deepEqual(filtersFromSearch('?q=hippiho'), { city: '', tag: '', query: 'hippiho' })
  assert.deepEqual(filtersFromSearch('?city=广州'), { city: '广州', tag: '', query: '' })
})

test('updating shared filters keeps route, history metadata parameters and a single copy of each filter', () => {
  const url = new URL(urlWithFilters('https://example.com/rank/?filters=1&city=旧城&city=另一城&mode=test#/place/a', { city: '苏州', tag: '', query: '  coffee  ' }))
  assert.equal(url.hash, '#/place/a')
  assert.equal(url.searchParams.get('mode'), 'test')
  assert.deepEqual(url.searchParams.getAll('city'), ['苏州'])
  assert.deepEqual(filtersFromSearch(url.search), { city: '苏州', tag: '', query: 'coffee' })
  const cleared = new URL(urlWithFilters(url.href, { city: '', tag: '', query: '' }))
  assert.deepEqual(filtersFromSearch(cleared.search), { city: '', tag: '', query: '' })
})
