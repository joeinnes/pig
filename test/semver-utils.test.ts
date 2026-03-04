import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rangeIncludes, alignmentCost } from '../src/semver-utils.ts'
import type { VersionGroup } from '../src/version-group-map.ts'

// --- rangeIncludes ---

test('rangeIncludes: caret range includes patch and minor bumps', () => {
  assert.ok(rangeIncludes('^4.0.0', '4.17.21'))
  assert.ok(rangeIncludes('^4.17.0', '4.17.21'))
  assert.ok(!rangeIncludes('^4.17.0', '5.0.0'))
})

test('rangeIncludes: tilde range includes patch bumps only', () => {
  assert.ok(rangeIncludes('~4.17.0', '4.17.21'))
  assert.ok(!rangeIncludes('~4.17.0', '4.18.0'))
})

test('rangeIncludes: exact version matches only that version', () => {
  assert.ok(rangeIncludes('4.17.21', '4.17.21'))
  assert.ok(!rangeIncludes('4.17.21', '4.17.22'))
})

test('rangeIncludes: >= includes version and above', () => {
  assert.ok(rangeIncludes('>=4.0.0', '4.17.21'))
  assert.ok(rangeIncludes('>=4.0.0', '5.0.0'))
  assert.ok(!rangeIncludes('>=4.0.0', '3.9.9'))
})

test('rangeIncludes: * matches any version', () => {
  assert.ok(rangeIncludes('*', '1.2.3'))
  assert.ok(rangeIncludes('*', '99.0.0'))
})

test('rangeIncludes: workspace:* always returns true', () => {
  assert.ok(rangeIncludes('workspace:*', '1.0.0'))
  assert.ok(rangeIncludes('workspace:*', '99.0.0'))
})

test('rangeIncludes: workspace:^ always returns true', () => {
  assert.ok(rangeIncludes('workspace:^', '1.0.0'))
  assert.ok(rangeIncludes('workspace:^', '0.1.0'))
})

test('rangeIncludes: workspace:~  always returns true', () => {
  assert.ok(rangeIncludes('workspace:~', '1.0.0'))
})

// --- alignmentCost ---

function makeGroup(usages: Array<{ declaredRange: string | null; version: string }>): VersionGroup {
  const versions = new Map<string, Array<{ projectRoot: string; resolvedVersion: string; declaredRange: string | null }>>()
  usages.forEach(({ declaredRange, version }, i) => {
    const entry = { projectRoot: `/proj-${i}`, resolvedVersion: version, declaredRange }
    const existing = versions.get(version) ?? []
    existing.push(entry)
    versions.set(version, existing)
  })
  return { name: 'lodash', versions }
}

test('alignmentCost: 0 when all ranges include candidate', () => {
  const group = makeGroup([
    { declaredRange: '^4.0.0', version: '4.16.0' },
    { declaredRange: '^4.0.0', version: '4.17.21' },
  ])
  assert.equal(alignmentCost(group, '4.17.21'), 0)
})

test('alignmentCost: counts projects whose range excludes candidate', () => {
  const group = makeGroup([
    { declaredRange: '^4.0.0', version: '4.16.0' },  // satisfied by 4.17.21
    { declaredRange: '^5.0.0', version: '5.0.0' },   // NOT satisfied by 4.17.21
  ])
  assert.equal(alignmentCost(group, '4.17.21'), 1)
})

test('alignmentCost: null declaredRange counts as cost 1', () => {
  const group = makeGroup([
    { declaredRange: null, version: '4.16.0' },
    { declaredRange: '^4.0.0', version: '4.17.21' },
  ])
  assert.equal(alignmentCost(group, '4.17.21'), 1)
})

test('alignmentCost: all null ranges = cost equal to project count', () => {
  const group = makeGroup([
    { declaredRange: null, version: '1.0.0' },
    { declaredRange: null, version: '2.0.0' },
  ])
  assert.equal(alignmentCost(group, '1.0.0'), 2)
})

test('alignmentCost: workspace ranges always count as cost 0', () => {
  const group = makeGroup([
    { declaredRange: 'workspace:*', version: '1.0.0' },
    { declaredRange: '^1.0.0', version: '1.0.0' },
  ])
  assert.equal(alignmentCost(group, '1.0.0'), 0)
})
