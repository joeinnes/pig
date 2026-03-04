import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  strategyAlignToLowest,
  strategyAlignToProject,
  strategyAlignToMostAcceptable,
} from '../src/strategies.ts'
import type { VersionGroup } from '../src/version-group-map.ts'

// Helper: build a VersionGroup from a simple list of {project, version, range?}
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

// ---- strategyAlignToLowest ----

test('alignToLowest: returns lowest semver in the group', () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.17.21' },
    { root: '/b', version: '4.16.0' },
    { root: '/c', version: '4.18.0' },
  ])
  const result = strategyAlignToLowest(group)
  assert.equal(result.targetVersion, '4.16.0')
  assert.equal(result.requiresNetwork, false)
})

test('alignToLowest: alignmentCost is correct', () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.16.0', range: '^4.0.0' },
    { root: '/b', version: '4.17.21', range: '^4.17.0' },
  ])
  const result = strategyAlignToLowest(group)
  // target is 4.16.0; /b has range ^4.17.0 which doesn't cover 4.16.0
  assert.equal(result.targetVersion, '4.16.0')
  assert.equal(result.alignmentCost, 1)
})

test('alignToLowest: cost 0 when all already on lowest', () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.17.21', range: '^4.0.0' },
    { root: '/b', version: '4.17.21', range: '^4.0.0' },
  ])
  // Only one distinct version — lowest and highest are same
  const result = strategyAlignToLowest(group)
  assert.equal(result.alignmentCost, 0)
})

// ---- strategyAlignToProject ----

test('alignToProject: returns version from specified project', () => {
  const group = makeGroup('react', [
    { root: '/work', version: '18.3.0' },
    { root: '/home', version: '18.2.0' },
  ])
  const result = strategyAlignToProject(group, '/work')
  assert.equal(result.type, 'success')
  if (result.type === 'success') {
    assert.equal(result.targetVersion, '18.3.0')
    assert.equal(result.requiresNetwork, false)
  }
})

test('alignToProject: returns error when project not in group', () => {
  const group = makeGroup('react', [
    { root: '/a', version: '18.2.0' },
  ])
  const result = strategyAlignToProject(group, '/nonexistent')
  assert.equal(result.type, 'error')
})

test('alignToProject: alignmentCost computed for other projects', () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.17.21', range: '^4.17.0' },  // target source
    { root: '/b', version: '4.16.0', range: '^4.16.0' },  // ^4.16.0 covers 4.17.21
    { root: '/c', version: '4.15.0', range: '^4.15.0' },  // ^4.15.0 covers 4.17.21
  ])
  const result = strategyAlignToProject(group, '/a')
  assert.equal(result.type, 'success')
  if (result.type === 'success') {
    assert.equal(result.targetVersion, '4.17.21')
    assert.equal(result.alignmentCost, 0) // both ^4.16 and ^4.15 cover 4.17.21
  }
})

// ---- strategyAlignToMostAcceptable ----

test('alignToMostAcceptable: picks version satisfying most ranges', () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.17.21', range: '^4.0.0' },  // covers both 4.16 and 4.17
    { root: '/b', version: '4.16.0', range: '^4.0.0' },   // covers both
    { root: '/c', version: '4.17.21', range: '^4.17.0' }, // only covers 4.17
  ])
  const result = strategyAlignToMostAcceptable(group)
  assert.equal(result.type, 'success')
  if (result.type === 'success') {
    assert.equal(result.targetVersion, '4.17.21')
  }
})

test('alignToMostAcceptable: semver-highest wins a tie', () => {
  const group = makeGroup('react', [
    { root: '/a', version: '18.2.0', range: '^18.0.0' }, // covers 18.x
    { root: '/b', version: '18.3.0', range: '^18.0.0' }, // covers 18.x
  ])
  // Both candidates satisfy both ranges — pick highest semver
  const result = strategyAlignToMostAcceptable(group)
  assert.equal(result.type, 'success')
  if (result.type === 'success') {
    assert.equal(result.targetVersion, '18.3.0')
  }
})

test('alignToMostAcceptable: returns tie when candidates cover distinct sets equally', () => {
  const group = makeGroup('pkg', [
    { root: '/a', version: '1.0.0', range: '^1.0.0' },  // only covers 1.x
    { root: '/b', version: '2.0.0', range: '^2.0.0' },  // only covers 2.x
  ])
  const result = strategyAlignToMostAcceptable(group)
  assert.equal(result.type, 'tie')
  if (result.type === 'tie') {
    assert.ok(result.tiedCandidates.includes('1.0.0'))
    assert.ok(result.tiedCandidates.includes('2.0.0'))
  }
})

test('alignToMostAcceptable: requiresNetwork is false', () => {
  const group = makeGroup('x', [
    { root: '/a', version: '1.0.0' },
    { root: '/b', version: '2.0.0' },
  ])
  const result = strategyAlignToMostAcceptable(group)
  assert.equal(result.requiresNetwork, false)
})

test('alignToMostAcceptable: alignmentCost correct in result', () => {
  const group = makeGroup('lodash', [
    { root: '/a', version: '4.17.21', range: '^4.0.0' },
    { root: '/b', version: '4.16.0', range: '^4.16.0' },
  ])
  // 4.17.21 satisfies both ^4.0.0 and ^4.16.0 → cost 0
  const result = strategyAlignToMostAcceptable(group)
  if (result.type === 'success') {
    assert.equal(result.alignmentCost, 0)
  }
})
