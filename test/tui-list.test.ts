import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runPackageListSession, type PackageAction, type ListSessionOptions } from '../src/tui-list.ts'
import type { VersionGroupMap, VersionGroup } from '../src/version-group-map.ts'

function makeGroup(name: string, versions: string[]): VersionGroup {
  const vmap = new Map(versions.map(v => [
    v,
    [{ projectRoot: `/proj-${v}`, resolvedVersion: v, declaredRange: `^${v}` }]
  ]))
  return { name, versions: vmap }
}

function makeMap(entries: Array<[string, string[]]>): VersionGroupMap {
  return new Map(entries.map(([name, versions]) => [name, makeGroup(name, versions)]))
}

function makeOptions(
  actions: PackageAction[],
  overrides: Partial<ListSessionOptions> = {}
): ListSessionOptions {
  let idx = 0
  return {
    picker: async () => actions[idx++] ?? 'quit',
    write: () => {},
    ...overrides,
  }
}

test('returns empty queue when all packages are skipped', async () => {
  const map = makeMap([['lodash', ['4.16.0', '4.17.21']], ['react', ['17.0.2', '18.2.0']]])
  const result = await runPackageListSession(map, makeOptions(['skip', 'skip']))
  assert.equal(result.queue.length, 0)
})

test('returns queue entries for packages with a chosen target', async () => {
  const map = makeMap([['lodash', ['4.16.0', '4.17.21']]])
  const result = await runPackageListSession(map, makeOptions([
    { type: 'select', targetVersion: '4.17.21' },
  ]))
  assert.equal(result.queue.length, 1)
  assert.equal(result.queue[0].packageName, 'lodash')
  assert.equal(result.queue[0].targetVersion, '4.17.21')
})

test('deferred packages are re-appended and processed again', async () => {
  const map = makeMap([['lodash', ['4.16.0', '4.17.21']]])
  const calls: string[] = []
  let count = 0
  const options: ListSessionOptions = {
    picker: async (pkg) => {
      calls.push(pkg.name)
      count++
      // Defer on first call, then select on second
      if (count === 1) return 'defer'
      return { type: 'select', targetVersion: '4.17.21' }
    },
    write: () => {},
  }
  const result = await runPackageListSession(map, options)
  assert.equal(calls.filter(n => n === 'lodash').length, 2, 'lodash should be presented twice (deferred once)')
  assert.equal(result.queue.length, 1)
})

test('quit action ends session and returns current queue', async () => {
  const map = makeMap([
    ['lodash', ['4.16.0', '4.17.21']],
    ['react', ['17.0.2', '18.2.0']],
  ])
  // Select lodash, then quit before react
  const result = await runPackageListSession(map, makeOptions([
    { type: 'select', targetVersion: '4.17.21' },
    'quit',
  ]))
  assert.equal(result.queue.length, 1)
  assert.equal(result.quit, true)
})

test('session ends naturally when all packages processed without quit', async () => {
  const map = makeMap([['lodash', ['4.16.0', '4.17.21']]])
  const result = await runPackageListSession(map, makeOptions([
    { type: 'select', targetVersion: '4.17.21' },
  ]))
  assert.equal(result.quit, false)
})

test('empty map produces empty queue immediately', async () => {
  const result = await runPackageListSession(new Map(), makeOptions([]))
  assert.equal(result.queue.length, 0)
  assert.equal(result.quit, false)
})

test('each queue entry includes projectRoot and currentRange', async () => {
  const map = makeMap([['lodash', ['4.16.0', '4.17.21']]])
  const result = await runPackageListSession(map, makeOptions([
    { type: 'select', targetVersion: '4.17.21' },
  ]))
  const entry = result.queue[0]
  assert.ok(entry.projectRoot, 'expected projectRoot')
  assert.ok(entry.currentRange !== undefined, 'expected currentRange')
})
