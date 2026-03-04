import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterByPackage, resolveStrategy, VALID_STRATEGIES } from '../src/focused-flags.ts'
import type { VersionGroupMap, VersionGroup } from '../src/version-group-map.ts'

function makeGroup(name: string, versions: string[]): VersionGroup {
  const vmap = new Map(versions.map(v => [
    v,
    [{ projectRoot: `/proj-${v}`, resolvedVersion: v, declaredRange: `^${v}` }]
  ]))
  return { name, versions: vmap }
}

function makeMap(entries: Array<[string, string[]]>): VersionGroupMap {
  return new Map(entries.map(([name, v]) => [name, makeGroup(name, v)]))
}

// --- filterByPackage ---

test('filterByPackage: returns filtered map with only named package', () => {
  const map = makeMap([['lodash', ['4.16.0', '4.17.21']], ['react', ['17.0.2', '18.2.0']]])
  const filtered = filterByPackage(map, 'lodash')
  assert.ok(filtered.type === 'ok')
  if (filtered.type === 'ok') {
    assert.equal(filtered.map.size, 1)
    assert.ok(filtered.map.has('lodash'))
    assert.ok(!filtered.map.has('react'))
  }
})

test('filterByPackage: returns error for unknown package', () => {
  const map = makeMap([['lodash', ['4.16.0', '4.17.21']]])
  const result = filterByPackage(map, 'unknown-pkg')
  assert.equal(result.type, 'error')
  if (result.type === 'error') {
    assert.ok(result.message.includes('unknown-pkg'))
  }
})

test('filterByPackage: returns map unchanged when packageName is undefined', () => {
  const map = makeMap([['lodash', ['4.16.0', '4.17.21']], ['react', ['17.0.2', '18.2.0']]])
  const result = filterByPackage(map, undefined)
  assert.equal(result.type, 'ok')
  if (result.type === 'ok') {
    assert.equal(result.map.size, 2)
  }
})

// --- resolveStrategy ---

test('resolveStrategy: returns null when no strategy specified', () => {
  const result = resolveStrategy(undefined)
  assert.equal(result.type, 'ok')
  if (result.type === 'ok') assert.equal(result.strategy, null)
})

test('resolveStrategy: returns valid strategy name', () => {
  for (const name of VALID_STRATEGIES) {
    const result = resolveStrategy(name)
    assert.equal(result.type, 'ok')
    if (result.type === 'ok') assert.equal(result.strategy, name)
  }
})

test('resolveStrategy: returns error for invalid strategy', () => {
  const result = resolveStrategy('invalid-strat')
  assert.equal(result.type, 'error')
  if (result.type === 'error') {
    assert.ok(result.message.includes('invalid-strat'))
    // Should list valid strategies
    for (const s of VALID_STRATEGIES) {
      assert.ok(result.message.includes(s), `expected "${s}" listed in error`)
    }
  }
})
