import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseV9 } from '../src/lockfile/parse-v9.ts'
import { parseLockfile } from '../src/lockfile/index.ts'

function makeTmpDir(): string {
  const dir = join(tmpdir(), `pig-test-${process.pid}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

// ─── parseV9 unit tests ──────────────────────────────────────────────────────

const V9_HEADER = `lockfileVersion: '9.0'\n\n`

test('v9: returns empty packages array when no snapshots section', () => {
  const result = parseV9(V9_HEADER + `settings:\n  autoInstallPeers: true\n`, '/project')
  assert.deepEqual(result.packages, [])
  assert.equal(result.lockfileVersion, '9.0')
  assert.equal(result.projectRoot, '/project')
})

test('v9: parses a simple unscoped package from snapshots', () => {
  const yaml = V9_HEADER + `snapshots:\n  lodash@4.17.21: {}\n`
  const { packages } = parseV9(yaml, '/project')
  assert.equal(packages.length, 1)
  assert.equal(packages[0].name, 'lodash')
  assert.equal(packages[0].version, '4.17.21')
})

test('v9: parses a scoped package', () => {
  const yaml = V9_HEADER + `snapshots:\n  '@scope/pkg@1.2.3': {}\n`
  const { packages } = parseV9(yaml, '/project')
  assert.equal(packages.length, 1)
  assert.equal(packages[0].name, '@scope/pkg')
  assert.equal(packages[0].version, '1.2.3')
})

test('v9: strips peer dep suffix from snapshot key', () => {
  const yaml = V9_HEADER + `snapshots:\n  'react@18.2.0(react-dom@18.2.0)': {}\n`
  const { packages } = parseV9(yaml, '/project')
  assert.equal(packages.length, 1)
  assert.equal(packages[0].name, 'react')
  assert.equal(packages[0].version, '18.2.0')
})

test('v9: does not pull packages from the packages: section', () => {
  // packages: in v9 is metadata, not resolved instances — must be ignored
  const yaml = V9_HEADER + `packages:\n  lodash@4.17.21:\n    resolution: {integrity: sha512-abc}\n\nsnapshots:\n  lodash@4.17.21: {}\n`
  const { packages } = parseV9(yaml, '/project')
  assert.equal(packages.length, 1) // only one, not two
})

test('v9: representative real-world v9 fixture', () => {
  const yaml = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:
  .:
    dependencies:
      lodash:
        specifier: ^4.17.21
        version: 4.17.21
      react:
        specifier: ^18.2.0
        version: 18.2.0(react-dom@18.2.0)

packages:
  lodash@4.17.21:
    resolution: {integrity: sha512-v2kDE==}
  react@18.2.0:
    resolution: {integrity: sha512-abc==}

snapshots:
  lodash@4.17.21: {}

  react@18.2.0(react-dom@18.2.0):
    dependencies:
      react-dom: 18.2.0(react@18.2.0)

  '@types/node@20.0.0': {}
`
  const { packages, lockfileVersion } = parseV9(yaml, '/my/project')
  assert.equal(lockfileVersion, '9.0')
  assert.equal(packages.length, 3)

  const lodash = packages.find(p => p.name === 'lodash')
  assert.ok(lodash)
  assert.equal(lodash!.version, '4.17.21')

  const react = packages.find(p => p.name === 'react')
  assert.ok(react)
  assert.equal(react!.version, '18.2.0')

  const types = packages.find(p => p.name === '@types/node')
  assert.ok(types)
  assert.equal(types!.version, '20.0.0')
})

// ─── parseLockfile dispatch tests ────────────────────────────────────────────

test('parseLockfile: auto-detects v6 and returns correct shape', async () => {
  const dir = makeTmpDir()
  try {
    const lockfile = join(dir, 'pnpm-lock.yaml')
    writeFileSync(lockfile, `lockfileVersion: '6.0'\n\npackages:\n  /lodash@4.17.21:\n    resolution: {integrity: sha512-abc}\n`)
    const result = await parseLockfile(lockfile)
    assert.equal(result.lockfileVersion, '6.0')
    assert.equal(result.projectRoot, dir)
    assert.equal(result.packages.length, 1)
    assert.equal(result.packages[0].name, 'lodash')
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('parseLockfile: auto-detects v9 and returns correct shape', async () => {
  const dir = makeTmpDir()
  try {
    const lockfile = join(dir, 'pnpm-lock.yaml')
    writeFileSync(lockfile, `lockfileVersion: '9.0'\n\nsnapshots:\n  lodash@4.17.21: {}\n`)
    const result = await parseLockfile(lockfile)
    assert.equal(result.lockfileVersion, '9.0')
    assert.equal(result.projectRoot, dir)
    assert.equal(result.packages.length, 1)
    assert.equal(result.packages[0].name, 'lodash')
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('parseLockfile: unknown version logs warning and returns packages', async () => {
  const dir = makeTmpDir()
  try {
    const lockfile = join(dir, 'pnpm-lock.yaml')
    // v9-style content but unknown version string
    writeFileSync(lockfile, `lockfileVersion: '99.0'\n\nsnapshots:\n  lodash@4.17.21: {}\n`)
    const warns: string[] = []
    const origWarn = console.warn
    console.warn = (...args: unknown[]) => warns.push(args.join(' '))
    try {
      const result = await parseLockfile(lockfile)
      assert.ok(warns.length > 0, 'expected a warning for unknown lockfile version')
      assert.ok(warns[0].includes('99.0'), `expected version in warning: ${warns[0]}`)
      // best-effort: should still return something
      assert.ok(Array.isArray(result.packages))
    } finally {
      console.warn = origWarn
    }
  } finally {
    rmSync(dir, { recursive: true })
  }
})
