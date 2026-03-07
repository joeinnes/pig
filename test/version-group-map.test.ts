import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildVersionGroupMap } from '../src/version-group-map.ts'
import type { ParsedLockfile } from '../src/lockfile/types.ts'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'pig-test-'))
}

function makeProject(
  root: string,
  packages: Array<{ name: string; version: string }>,
  deps: Record<string, string> = {}
): ParsedLockfile {
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: deps }))
  return { lockfileVersion: '9.0', projectRoot: root, packages }
}

test('single package at two different versions across two projects appears in map', () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    const lockfiles = [
      makeProject(a, [{ name: 'lodash', version: '4.16.0' }], { lodash: '^4.16.0' }),
      makeProject(b, [{ name: 'lodash', version: '4.17.21' }], { lodash: '^4.17.0' }),
    ]
    const map = buildVersionGroupMap(lockfiles)
    assert.ok(map.has('lodash'), 'lodash should be in map')
    const group = map.get('lodash')!
    assert.equal(group.versions.size, 2)
    assert.ok(group.versions.has('4.16.0'))
    assert.ok(group.versions.has('4.17.21'))
  } finally {
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true })
  }
})

test('package at same version across all projects is NOT included', () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    const lockfiles = [
      makeProject(a, [{ name: 'lodash', version: '4.17.21' }]),
      makeProject(b, [{ name: 'lodash', version: '4.17.21' }]),
    ]
    const map = buildVersionGroupMap(lockfiles)
    assert.ok(!map.has('lodash'), 'lodash at same version should not appear')
  } finally {
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true })
  }
})

test('declaredRange read from dependencies', () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    writeFileSync(join(a, 'package.json'), JSON.stringify({ dependencies: { lodash: '^4.16.0' } }))
    writeFileSync(join(b, 'package.json'), JSON.stringify({ devDependencies: { lodash: '^4.17.0' } }))
    const lockfiles: ParsedLockfile[] = [
      { lockfileVersion: '9.0', projectRoot: a, packages: [{ name: 'lodash', version: '4.16.0' }] },
      { lockfileVersion: '9.0', projectRoot: b, packages: [{ name: 'lodash', version: '4.17.21' }] },
    ]
    const map = buildVersionGroupMap(lockfiles)
    const group = map.get('lodash')!
    const usagesA = group.versions.get('4.16.0')!
    assert.equal(usagesA[0].declaredRange, '^4.16.0')
    const usagesB = group.versions.get('4.17.21')!
    assert.equal(usagesB[0].declaredRange, '^4.17.0')
  } finally {
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true })
  }
})

test('declaredRange is null when package.json is missing', () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    // a has no package.json
    writeFileSync(join(b, 'package.json'), JSON.stringify({ dependencies: { lodash: '^4.17.0' } }))
    const lockfiles: ParsedLockfile[] = [
      { lockfileVersion: '9.0', projectRoot: a, packages: [{ name: 'lodash', version: '4.16.0' }] },
      { lockfileVersion: '9.0', projectRoot: b, packages: [{ name: 'lodash', version: '4.17.21' }] },
    ]
    const map = buildVersionGroupMap(lockfiles)
    const group = map.get('lodash')!
    const usagesA = group.versions.get('4.16.0')!
    assert.equal(usagesA[0].declaredRange, null)
  } finally {
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true })
  }
})

test('declaredRange is null when package not listed in package.json', () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    writeFileSync(join(a, 'package.json'), JSON.stringify({ dependencies: { react: '^18.0.0' } }))
    writeFileSync(join(b, 'package.json'), JSON.stringify({ dependencies: { lodash: '^4.17.0' } }))
    const lockfiles: ParsedLockfile[] = [
      { lockfileVersion: '9.0', projectRoot: a, packages: [{ name: 'lodash', version: '4.16.0' }] },
      { lockfileVersion: '9.0', projectRoot: b, packages: [{ name: 'lodash', version: '4.17.21' }] },
    ]
    const map = buildVersionGroupMap(lockfiles)
    const group = map.get('lodash')!
    const usagesA = group.versions.get('4.16.0')!
    assert.equal(usagesA[0].declaredRange, null) // lodash not in project a's package.json
  } finally {
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true })
  }
})

test('scoped packages keyed correctly', () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    const lockfiles = [
      makeProject(a, [{ name: '@scope/pkg', version: '1.0.0' }]),
      makeProject(b, [{ name: '@scope/pkg', version: '2.0.0' }]),
    ]
    const map = buildVersionGroupMap(lockfiles)
    assert.ok(map.has('@scope/pkg'))
    assert.equal(map.get('@scope/pkg')!.versions.size, 2)
  } finally {
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true })
  }
})

test('same projectRoot appearing twice is deduplicated', () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    const lockfileA: ParsedLockfile = makeProject(a, [{ name: 'lodash', version: '4.16.0' }])
    const lockfileB: ParsedLockfile = makeProject(b, [{ name: 'lodash', version: '4.17.21' }])
    // Pass lockfileA twice
    const map = buildVersionGroupMap([lockfileA, lockfileA, lockfileB])
    const group = map.get('lodash')!
    // Project A should only appear once in the 4.16.0 usages
    const usages = group.versions.get('4.16.0')!
    assert.equal(usages.length, 1)
    assert.equal(usages[0].projectRoot, a)
  } finally {
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true })
  }
})

test('peer dep variants of same version deduplicated within a project', () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    // Project a has react@18.2.0 twice (two peer dep variants, same version after stripping)
    const lockfiles = [
      makeProject(a, [
        { name: 'react', version: '18.2.0' },
        { name: 'react', version: '18.2.0' }, // duplicate same version
      ]),
      makeProject(b, [{ name: 'react', version: '17.0.2' }]),
    ]
    const map = buildVersionGroupMap(lockfiles)
    const group = map.get('react')!
    const usages = group.versions.get('18.2.0')!
    assert.equal(usages.length, 1, 'project a should appear only once for react@18.2.0')
  } finally {
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true })
  }
})

test('optionalDependencies and peerDependencies are also checked for declaredRange', () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    writeFileSync(join(a, 'package.json'), JSON.stringify({ optionalDependencies: { lodash: '^4.16.0' } }))
    writeFileSync(join(b, 'package.json'), JSON.stringify({ peerDependencies: { lodash: '^4.17.0' } }))
    const lockfiles: ParsedLockfile[] = [
      { lockfileVersion: '9.0', projectRoot: a, packages: [{ name: 'lodash', version: '4.16.0' }] },
      { lockfileVersion: '9.0', projectRoot: b, packages: [{ name: 'lodash', version: '4.17.21' }] },
    ]
    const map = buildVersionGroupMap(lockfiles)
    const group = map.get('lodash')!
    assert.equal(group.versions.get('4.16.0')![0].declaredRange, '^4.16.0')
    assert.equal(group.versions.get('4.17.21')![0].declaredRange, '^4.17.0')
  } finally {
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true })
  }
})
