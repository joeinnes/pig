import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseV6 } from '../src/lockfile/parse-v6.ts'

const V6_HEADER = `lockfileVersion: '6.0'\n\n`

test('returns empty packages array when no packages section', () => {
  const result = parseV6(V6_HEADER + `settings:\n  autoInstallPeers: true\n`, '/project')
  assert.deepEqual(result.packages, [])
  assert.equal(result.lockfileVersion, '6.0')
  assert.equal(result.projectRoot, '/project')
})

test('parses a simple unscoped package', () => {
  const yaml = V6_HEADER + `packages:\n  /lodash@4.17.21:\n    resolution: {integrity: sha512-abc}\n`
  const { packages } = parseV6(yaml, '/project')
  assert.equal(packages.length, 1)
  assert.equal(packages[0].name, 'lodash')
  assert.equal(packages[0].version, '4.17.21')
})

test('parses a scoped package', () => {
  const yaml = V6_HEADER + `packages:\n  /@scope/pkg@1.2.3:\n    resolution: {integrity: sha512-abc}\n`
  const { packages } = parseV6(yaml, '/project')
  assert.equal(packages.length, 1)
  assert.equal(packages[0].name, '@scope/pkg')
  assert.equal(packages[0].version, '1.2.3')
})

test('strips peer dep suffix from key', () => {
  const yaml = V6_HEADER + `packages:\n  /react@18.2.0(react-dom@18.2.0):\n    resolution: {integrity: sha512-abc}\n`
  const { packages } = parseV6(yaml, '/project')
  assert.equal(packages.length, 1)
  assert.equal(packages[0].name, 'react')
  assert.equal(packages[0].version, '18.2.0')
})

test('strips multiple peer dep suffixes', () => {
  const yaml = V6_HEADER + `packages:\n  /@scope/pkg@1.0.0(peer1@1.0.0)(peer2@2.0.0):\n    resolution: {integrity: sha512-abc}\n`
  const { packages } = parseV6(yaml, '/project')
  assert.equal(packages[0].name, '@scope/pkg')
  assert.equal(packages[0].version, '1.0.0')
})

test('ignores settings: and importers: sections', () => {
  const yaml = V6_HEADER + `settings:\n  autoInstallPeers: true\n\nimporters:\n  .:\n    dependencies:\n      lodash:\n        specifier: ^4.17.21\n        version: 4.17.21\n\npackages:\n  /lodash@4.17.21:\n    resolution: {integrity: sha512-abc}\n`
  const { packages } = parseV6(yaml, '/project')
  assert.equal(packages.length, 1)
  assert.equal(packages[0].name, 'lodash')
})

test('parses multiple packages', () => {
  const yaml = V6_HEADER + `packages:\n  /lodash@4.17.21:\n    resolution: {integrity: sha512-aaa}\n  /react@18.2.0:\n    resolution: {integrity: sha512-bbb}\n  /@types/node@20.0.0:\n    resolution: {integrity: sha512-ccc}\n`
  const { packages } = parseV6(yaml, '/project')
  assert.equal(packages.length, 3)
  const names = packages.map(p => p.name)
  assert.ok(names.includes('lodash'))
  assert.ok(names.includes('react'))
  assert.ok(names.includes('@types/node'))
})

test('does not throw on unknown fields in package entries', () => {
  const yaml = V6_HEADER + `packages:\n  /lodash@4.17.21:\n    resolution: {integrity: sha512-abc}\n    engines: {node: '>=0'}\n    dev: false\n    someUnknownField: true\n`
  assert.doesNotThrow(() => parseV6(yaml, '/project'))
})

test('representative real-world v6 fixture', () => {
  const yaml = `lockfileVersion: '6.0'

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
    devDependencies:
      '@types/node':
        specifier: ^20.0.0
        version: 20.0.0

packages:

  /lodash@4.17.21:
    resolution: {integrity: sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZKFeNy5zIlDOoGJFhQ==}
    engines: {node: '>=0.0.1'}
    dev: false

  /react@18.2.0(react-dom@18.2.0):
    resolution: {integrity: sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2sDcEP7W4a2WTQ5==}
    peerDependencies:
      react-dom: '*'
    dev: false

  /@types/node@20.0.0:
    resolution: {integrity: sha512-abc}
    dev: true
`
  const { packages, lockfileVersion, projectRoot } = parseV6(yaml, '/my/project')
  assert.equal(lockfileVersion, '6.0')
  assert.equal(projectRoot, '/my/project')
  assert.equal(packages.length, 3)

  const lodash = packages.find(p => p.name === 'lodash')
  assert.ok(lodash, 'lodash not found')
  assert.equal(lodash!.version, '4.17.21')

  const react = packages.find(p => p.name === 'react')
  assert.ok(react, 'react not found')
  assert.equal(react!.version, '18.2.0')

  const types = packages.find(p => p.name === '@types/node')
  assert.ok(types, 'types/node not found')
  assert.equal(types!.version, '20.0.0')
})
