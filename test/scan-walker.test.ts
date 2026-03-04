import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, isAbsolute } from 'node:path'
import { walkScanPaths } from '../src/scan-walker.ts'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'pig-test-'))
}

function touch(path: string): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, '')
}

test('finds pnpm-lock.yaml at root of scan path', async () => {
  const dir = makeTmpDir()
  try {
    touch(join(dir, 'pnpm-lock.yaml'))
    const results = await walkScanPaths([dir])
    assert.equal(results.length, 1)
    assert.equal(results[0].lockfilePath, join(dir, 'pnpm-lock.yaml'))
    assert.equal(results[0].projectRoot, dir)
  } finally { rmSync(dir, { recursive: true }) }
})

test('finds pnpm-lock.yaml nested multiple levels deep', async () => {
  const dir = makeTmpDir()
  try {
    touch(join(dir, 'a', 'b', 'c', 'pnpm-lock.yaml'))
    const results = await walkScanPaths([dir])
    assert.equal(results.length, 1)
    assert.equal(results[0].lockfilePath, join(dir, 'a', 'b', 'c', 'pnpm-lock.yaml'))
  } finally { rmSync(dir, { recursive: true }) }
})

test('skips node_modules at any depth by default', async () => {
  const dir = makeTmpDir()
  try {
    touch(join(dir, 'project', 'pnpm-lock.yaml'))
    touch(join(dir, 'project', 'node_modules', 'pkg', 'pnpm-lock.yaml'))
    touch(join(dir, 'node_modules', 'pnpm-lock.yaml'))
    const results = await walkScanPaths([dir])
    assert.equal(results.length, 1)
    assert.equal(results[0].lockfilePath, join(dir, 'project', 'pnpm-lock.yaml'))
  } finally { rmSync(dir, { recursive: true }) }
})

test('skips .git at any depth by default', async () => {
  const dir = makeTmpDir()
  try {
    touch(join(dir, 'project', 'pnpm-lock.yaml'))
    touch(join(dir, 'project', '.git', 'pnpm-lock.yaml'))
    const results = await walkScanPaths([dir])
    assert.equal(results.length, 1)
  } finally { rmSync(dir, { recursive: true }) }
})

test('custom ignore pattern **/archived/** skips matching directories', async () => {
  const dir = makeTmpDir()
  try {
    touch(join(dir, 'active', 'pnpm-lock.yaml'))
    touch(join(dir, 'archived', 'old', 'pnpm-lock.yaml'))
    const results = await walkScanPaths([dir], ['**/archived/**'])
    assert.equal(results.length, 1)
    assert.equal(results[0].lockfilePath, join(dir, 'active', 'pnpm-lock.yaml'))
  } finally { rmSync(dir, { recursive: true }) }
})

test('returns empty array for non-existent scan path', async () => {
  const results = await walkScanPaths(['/this/path/does/not/exist/ever'])
  assert.deepEqual(results, [])
})

test('returns empty array when no pnpm-lock.yaml files found', async () => {
  const dir = makeTmpDir()
  try {
    mkdirSync(join(dir, 'project'), { recursive: true })
    writeFileSync(join(dir, 'project', 'package.json'), '{}')
    const results = await walkScanPaths([dir])
    assert.deepEqual(results, [])
  } finally { rmSync(dir, { recursive: true }) }
})

test('all output paths are absolute', async () => {
  const dir = makeTmpDir()
  try {
    touch(join(dir, 'pnpm-lock.yaml'))
    const results = await walkScanPaths([dir])
    for (const r of results) {
      assert.ok(isAbsolute(r.lockfilePath), `lockfilePath not absolute: ${r.lockfilePath}`)
      assert.ok(isAbsolute(r.projectRoot), `projectRoot not absolute: ${r.projectRoot}`)
    }
  } finally { rmSync(dir, { recursive: true }) }
})

test('does not follow symlinks', async () => {
  const dir = makeTmpDir()
  const target = makeTmpDir()
  try {
    touch(join(target, 'pnpm-lock.yaml'))
    // Create a symlink inside dir pointing to target
    symlinkSync(target, join(dir, 'linked'))
    const results = await walkScanPaths([dir])
    assert.deepEqual(results, [], 'should not follow symlink into target')
  } finally {
    rmSync(dir, { recursive: true })
    rmSync(target, { recursive: true })
  }
})

test('finds lockfiles across multiple scan paths', async () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    touch(join(a, 'pnpm-lock.yaml'))
    touch(join(b, 'nested', 'pnpm-lock.yaml'))
    const results = await walkScanPaths([a, b])
    assert.equal(results.length, 2)
  } finally {
    rmSync(a, { recursive: true })
    rmSync(b, { recursive: true })
  }
})
