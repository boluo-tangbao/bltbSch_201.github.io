import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { preparePagesUpload, uploadCleanupTargets } from '../../scripts/prepare-pages-upload.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'pages-upload-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  function put(path, text = 'preserved') { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text) }
  put('_site/index.html'); put('_site/rank/index.html'); put('_site/rank/images/photo.jpg')
  put('assets/generated/activities/media/cached.webp'); put('.git/config')
  for (const path of uploadCleanupTargets) put(`${path}/copy`, 'disposable')
  return { root, env: { GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', GITHUB_WORKSPACE: root }, log: () => {} }
}

test('upload cleanup only removes finished build copies, preserving deployment bytes, checkout metadata and activity cache', t => {
  const options = fixture(t)
  const result = preparePagesUpload({ ...options, apply: true })
  assert.equal(result.released, 'disposable'.length * uploadCleanupTargets.length)
  for (const path of uploadCleanupTargets) assert.equal(existsSync(join(options.root, path)), false)
  for (const path of ['_site/index.html', '_site/rank/index.html', '_site/rank/images/photo.jpg', 'assets/generated/activities/media/cached.webp', '.git/config']) {
    assert.equal(readFileSync(join(options.root, path), 'utf8'), 'preserved')
  }
  assert.ok(result.requiredBytes > result.siteBytes)
})

test('local apply, wrong workspace and absent deployment are rejected without deleting any copy; default is read only', t => {
  const options = fixture(t)
  preparePagesUpload({ ...options, env: {} })
  for (const env of [{}, { ...options.env, RUNNER_ENVIRONMENT: 'self-hosted' }, { ...options.env, GITHUB_WORKSPACE: tmpdir() }]) {
    assert.throws(() => preparePagesUpload({ ...options, env, apply: true }), /仅允许/)
  }
  for (const path of uploadCleanupTargets) assert.ok(existsSync(join(options.root, path, 'copy')))
  rmSync(join(options.root, '_site/index.html'))
  assert.throws(() => preparePagesUpload({ ...options, apply: true }), /先完成网站/)
  assert.ok(existsSync(join(options.root, 'rank/dist/copy')))
})

test('a linked cleanup target fails the full preflight before any deletion', t => {
  const options = fixture(t)
  const publicDir = join(options.root, 'rank/public')
  rmSync(publicDir, { recursive: true })
  try { symlinkSync(join(options.root, '_site'), publicDir, process.platform === 'win32' ? 'junction' : 'dir') }
  catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('当前环境不允许创建目录链接；Linux CI 会执行此项'); return }
    throw error
  }
  assert.throws(() => preparePagesUpload({ ...options, apply: true }), /拒绝处理链接/)
  assert.ok(existsSync(join(options.root, 'rank/dist/copy')))
  assert.ok(existsSync(join(options.root, '_site/index.html')))
})
