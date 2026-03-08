import { test } from 'node:test'
import assert from 'node:assert/strict'
import { strategyUpgradeToLatest, clearStrategyLatestCache } from '../src/strategy-latest.ts'
import type { VersionGroup } from '../src/version-group-map.ts'

function makeGroup(
  name: string,
  entries: Array<{ root: string; version: string; range?: string | null }>
): VersionGroup {
  const versions = new Map<string, Array<{ projectRoot: string; resolvedVersion: string; declaredRange: string | null }>>()
  for (const { root, version, range = null } of entries) {
    const existing = versions.get(version) ?? []
    existing.push({ projectRoot: root, resolvedVersion: version, declaredRange: range })
    versions.set(version, existing)
  }
  return { name, versions }
}

const REGISTRY = 'https://registry.npmjs.org'

function mockFetcher(latestVersion: string): typeof fetch {
  const body = {
    'dist-tags': { latest: latestVersion },
    versions: {
      [latestVersion]: { dist: { unpackedSize: 5000 } },
      '1.0.0': { dist: { unpackedSize: 1000 } },
    },
    time: {
      [latestVersion]: '2024-01-01T00:00:00.000Z',
      '1.0.0': '2020-01-01T00:00:00.000Z',
    },
  }
  return (async () => ({ ok: true, status: 200, json: async () => body })) as unknown as typeof fetch
}

function errorFetcher(): typeof fetch {
  return (async () => { throw new Error('ECONNREFUSED') }) as unknown as typeof fetch
}

function notFoundFetcher(): typeof fetch {
  return (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch
}

test('uses dist-tags.latest as target version', async () => {
  clearStrategyLatestCache()
  const group = makeGroup('react', [
    { root: '/a', version: '18.2.0', range: '^18.0.0' },
  ])
  const result = await strategyUpgradeToLatest(group, REGISTRY, { fetcher: mockFetcher('18.3.1') })
  assert.equal(result.type, 'success')
  if (result.type === 'success') {
    assert.equal(result.targetVersion, '18.3.1')
  }
})

test('requiresNetwork is true', async () => {
  clearStrategyLatestCache()
  const group = makeGroup('react', [
    { root: '/a', version: '18.2.0' },
  ])
  const result = await strategyUpgradeToLatest(group, REGISTRY, { fetcher: mockFetcher('18.3.1') })
  assert.equal(result.requiresNetwork, true)
})

test('alignmentCost computed correctly', async () => {
  clearStrategyLatestCache()
  const group = makeGroup('react', [
    { root: '/a', version: '18.2.0', range: '^18.0.0' }, // covers 18.3.1
    { root: '/b', version: '17.0.2', range: '^17.0.0' }, // does NOT cover 18.3.1
  ])
  const result = await strategyUpgradeToLatest(group, REGISTRY, { fetcher: mockFetcher('18.3.1') })
  assert.equal(result.type, 'success')
  if (result.type === 'success') {
    assert.equal(result.alignmentCost, 1)
  }
})

test('network error surfaces as user-friendly error result', async () => {
  clearStrategyLatestCache()
  const group = makeGroup('react', [{ root: '/a', version: '18.2.0' }])
  const result = await strategyUpgradeToLatest(group, REGISTRY, { fetcher: errorFetcher() })
  assert.equal(result.type, 'error')
  if (result.type === 'error') {
    assert.ok(result.message.length > 0)
  }
})

test('HTTP error surfaces as user-friendly error result', async () => {
  clearStrategyLatestCache()
  const group = makeGroup('react', [{ root: '/a', version: '18.2.0' }])
  const result = await strategyUpgradeToLatest(group, REGISTRY, { fetcher: notFoundFetcher() })
  assert.equal(result.type, 'error')
})
