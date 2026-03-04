import { test } from 'node:test'
import assert from 'node:assert/strict'
import { strategySelectVersion, clearSelectCache } from '../src/strategy-select.ts'
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

function mockFetcher(versions: string[]): typeof fetch {
  const body = {
    'dist-tags': { latest: versions[0] },
    versions: Object.fromEntries(versions.map(v => [v, { dist: { unpackedSize: 1000 } }])),
    time: Object.fromEntries(versions.map((v, i) => [v, `${2024 - i}-01-01T00:00:00.000Z`])),
  }
  return (async () => ({ ok: true, status: 200, json: async () => body })) as unknown as typeof fetch
}

// A picker that always selects the first item presented
function firstPicker<T>(items: T[]): Promise<T | symbol> {
  return Promise.resolve(items[0])
}

// A picker that cancels (returns the cancel symbol)
function cancelPicker<T>(_items: T[]): Promise<T | symbol> {
  return Promise.resolve(Symbol('cancel'))
}

test('returns success with selected version', async () => {
  clearSelectCache()
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.16.0' },
    { root: '/b', version: '4.17.21' },
  ])
  const result = await strategySelectVersion(group, REGISTRY, {
    fetcher: mockFetcher(['4.17.21', '4.16.0']),
    picker: firstPicker,
  })
  assert.equal(result.type, 'success')
  if (result.type === 'success') {
    assert.equal(result.targetVersion, '4.17.21')
    assert.equal(result.requiresNetwork, true)
  }
})

test('returns cancelled when picker cancels', async () => {
  clearSelectCache()
  const group = makeGroup('lodash', [{ root: '/a', version: '4.17.21' }])
  const result = await strategySelectVersion(group, REGISTRY, {
    fetcher: mockFetcher(['4.17.21']),
    picker: cancelPicker,
  })
  assert.equal(result.type, 'cancelled')
})

test('alignmentCost computed for selected version', async () => {
  clearSelectCache()
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.16.0', range: '^4.0.0' },
    { root: '/b', version: '4.17.21', range: '^4.17.0' },
  ])
  const result = await strategySelectVersion(group, REGISTRY, {
    fetcher: mockFetcher(['4.17.21', '4.16.0']),
    picker: firstPicker,
  })
  assert.equal(result.type, 'success')
  if (result.type === 'success') {
    // 4.17.21 satisfies ^4.0.0 and ^4.17.0 → cost 0
    assert.equal(result.alignmentCost, 0)
  }
})

test('versions presented newest first (fetched order preserved)', async () => {
  clearSelectCache()
  const group = makeGroup('react', [{ root: '/a', version: '18.2.0' }])
  const presented: unknown[] = []
  const capturePicker = async (items: unknown[]) => {
    presented.push(...items)
    return items[0]
  }
  await strategySelectVersion(group, REGISTRY, {
    fetcher: mockFetcher(['18.3.0', '18.2.0', '18.1.0']),
    picker: capturePicker as never,
  })
  // First item should be newest (18.3.0) — items are PickerItem objects
  const first = presented[0] as { label: string; value: string }
  assert.ok(first.value === '18.3.0', `first item value should be 18.3.0, got: ${first.value}`)
})

test('network error returns error result', async () => {
  clearSelectCache()
  const group = makeGroup('react', [{ root: '/a', version: '18.2.0' }])
  const brokenFetch = (async () => { throw new Error('ECONNREFUSED') }) as unknown as typeof fetch
  const result = await strategySelectVersion(group, REGISTRY, {
    fetcher: brokenFetch,
    picker: firstPicker,
  })
  assert.equal(result.type, 'error')
})
