import { test } from 'node:test'
import assert from 'node:assert/strict'
import { showPackageDetail, type DetailOptions, type StrategyChoice } from '../src/tui-detail.ts'
import type { VersionGroup } from '../src/version-group-map.ts'

function makeGroup(name: string, entries: Array<{ root: string; version: string; range?: string | null }>): VersionGroup {
  const versions = new Map(entries.map(({ root, version, range = null }) => [
    version,
    [{ projectRoot: root, resolvedVersion: version, declaredRange: range }],
  ]))
  return { name, versions }
}

function opts(choice: StrategyChoice, overrides: Partial<DetailOptions> = {}): DetailOptions {
  return {
    strategyPicker: async () => choice,
    projectPicker: async (roots: string[]) => roots[0],
    registryUrl: 'https://registry.npmjs.org',
    fetcher: (async () => ({ ok: true, status: 200, json: async () => ({ versions: {}, time: {}, 'dist-tags': { latest: '4.17.21' } }) })) as unknown as typeof fetch,
    write: () => {},
    ...overrides,
  }
}

test('lowest strategy returns lowest semver as target', async () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.16.0', range: '^4.0.0' },
    { root: '/b', version: '4.17.21', range: '^4.0.0' },
  ])
  const action = await showPackageDetail(group, opts('lowest'))
  assert.equal(action.type, 'select')
  if (action.type === 'select') assert.equal(action.targetVersion, '4.16.0')
})

test('most-acceptable strategy returns best matching version', async () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.17.21', range: '^4.0.0' },
    { root: '/b', version: '4.16.0', range: '^4.0.0' },
  ])
  const action = await showPackageDetail(group, opts('most-acceptable'))
  assert.equal(action.type, 'select')
  if (action.type === 'select') {
    assert.ok(['4.17.21', '4.16.0'].includes(action.targetVersion))
  }
})

test('project strategy uses projectPicker to select reference project', async () => {
  const group = makeGroup('lodash', [
    { root: '/work', version: '4.17.21', range: '^4.17.0' },
    { root: '/home', version: '4.16.0', range: '^4.16.0' },
  ])
  const action = await showPackageDetail(group, opts('project', {
    projectPicker: async () => '/work',
  }))
  assert.equal(action.type, 'select')
  if (action.type === 'select') assert.equal(action.targetVersion, '4.17.21')
})

test('latest strategy uses registry dist-tags.latest', async () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.16.0' },
    { root: '/b', version: '4.17.21' },
  ])
  const action = await showPackageDetail(group, opts('latest', {
    fetcher: (async () => ({
      ok: true, status: 200,
      json: async () => ({ versions: {}, time: {}, 'dist-tags': { latest: '4.18.0' } }),
    })) as unknown as typeof fetch,
  }))
  assert.equal(action.type, 'select')
  if (action.type === 'select') assert.equal(action.targetVersion, '4.18.0')
})

test('skip strategy returns skip action', async () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.17.21' },
    { root: '/b', version: '4.16.0' },
  ])
  const action = await showPackageDetail(group, opts('skip'))
  assert.equal(action, 'skip')
})

test('defer strategy returns defer action', async () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.17.21' },
    { root: '/b', version: '4.16.0' },
  ])
  const action = await showPackageDetail(group, opts('defer'))
  assert.equal(action, 'defer')
})

test('quit strategy returns quit action', async () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.17.21' },
    { root: '/b', version: '4.16.0' },
  ])
  const action = await showPackageDetail(group, opts('quit'))
  assert.equal(action, 'quit')
})
