import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { estimateStoreSavings } from '../src/store-savings.ts'
import type { VersionGroupMap } from '../src/version-group-map.ts'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'pig-test-'))
}

function emptyMap(): VersionGroupMap {
  return new Map()
}

function twoVersionMap(): VersionGroupMap {
  const versions = new Map([
    ['1.0.0', [{ projectRoot: '/a', resolvedVersion: '1.0.0', declaredRange: '^1.0.0' }]],
    ['2.0.0', [{ projectRoot: '/b', resolvedVersion: '2.0.0', declaredRange: '^2.0.0' }]],
  ])
  return new Map([['lodash', { name: 'lodash', versions }]])
}

test('storeFound: false when storePath does not exist', async () => {
  const result = await estimateStoreSavings(emptyMap(), '/nonexistent/path/to/store')
  assert.equal(result.storeFound, false)
})

test('storeFound: false when storePath has no files directory', async () => {
  const dir = makeTmpDir()
  try {
    const result = await estimateStoreSavings(emptyMap(), dir)
    assert.equal(result.storeFound, false)
  } finally { rmSync(dir, { recursive: true }) }
})

test('storeFound: true when storePath has files directory', async () => {
  const dir = makeTmpDir()
  try {
    mkdirSync(join(dir, 'files'))
    const result = await estimateStoreSavings(emptyMap(), dir)
    assert.equal(result.storeFound, true)
  } finally { rmSync(dir, { recursive: true }) }
})

test('estimatedSavingsBytes is non-negative for empty map', async () => {
  const dir = makeTmpDir()
  try {
    mkdirSync(join(dir, 'files'))
    const result = await estimateStoreSavings(emptyMap(), dir)
    assert.ok(result.estimatedSavingsBytes >= 0)
  } finally { rmSync(dir, { recursive: true }) }
})

test('estimatedSavingsBytes is non-negative for populated map', async () => {
  const dir = makeTmpDir()
  try {
    mkdirSync(join(dir, 'files'))
    const result = await estimateStoreSavings(twoVersionMap(), dir)
    assert.ok(result.estimatedSavingsBytes >= 0)
  } finally { rmSync(dir, { recursive: true }) }
})

test('estimatedSavingsBytes is 0 when storeFound is false', async () => {
  const result = await estimateStoreSavings(twoVersionMap(), '/nonexistent/store')
  assert.equal(result.storeFound, false)
  assert.equal(result.estimatedSavingsBytes, 0)
})

test('result has correct shape', async () => {
  const dir = makeTmpDir()
  try {
    mkdirSync(join(dir, 'files'))
    const result = await estimateStoreSavings(emptyMap(), dir)
    assert.ok('storeFound' in result)
    assert.ok('estimatedSavingsBytes' in result)
    assert.equal(typeof result.storeFound, 'boolean')
    assert.equal(typeof result.estimatedSavingsBytes, 'number')
  } finally { rmSync(dir, { recursive: true }) }
})
