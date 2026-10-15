import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exportCheckpoint, waitForExport } from '../src/utils/exportTask.ts'

test('export waiting can be cancelled promptly and preserves the abort reason', async () => {
  const controller = new AbortController()
  const waiting = waitForExport(new Promise(() => {}), controller.signal)
  const reason = new DOMException('Cancelled', 'AbortError')
  controller.abort(reason)
  await assert.rejects(waiting, error => error === reason)
  await assert.rejects(exportCheckpoint({ signal: controller.signal }), error => error === reason)
})

test('export checkpoints yield and normal promises still settle', async () => {
  assert.equal(await waitForExport(Promise.resolve(42)), 42)
  assert.equal(await waitForExport(Promise.resolve(7), new AbortController().signal), 7)
  await assert.rejects(waitForExport(Promise.reject(new Error('failure')), new AbortController().signal), /failure/)
  let yielded = false
  setTimeout(() => { yielded = true }, 0)
  await exportCheckpoint({})
  assert.equal(yielded, true)
})
