import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transformRange, updatePackageJsonRange } from '../src/pkg-updater.ts'

// --- transformRange unit tests ---

test('transformRange: ^ prefix updated to new version', () => {
  const { newRange, changed } = transformRange('^1.0.0', '2.0.0')
  assert.equal(newRange, '^2.0.0')
  assert.ok(changed)
})

test('transformRange: ~ prefix updated to new version', () => {
  const { newRange, changed } = transformRange('~1.0.0', '1.1.0')
  assert.equal(newRange, '~1.1.0')
  assert.ok(changed)
})

test('transformRange: exact version updated with warning', () => {
  const { newRange, changed, warning } = transformRange('1.0.0', '2.0.0')
  assert.equal(newRange, '2.0.0')
  assert.ok(changed)
  assert.ok(warning && warning.length > 0, 'expected a warning for exact pin update')
})

test('transformRange: >= comparator preserves operator', () => {
  const { newRange, changed } = transformRange('>=1.0.0', '2.0.0')
  assert.equal(newRange, '>=2.0.0')
  assert.ok(changed)
})

test('transformRange: workspace:* is untouched', () => {
  const { newRange, changed } = transformRange('workspace:*', '2.0.0')
  assert.equal(newRange, 'workspace:*')
  assert.equal(changed, false)
})

test('transformRange: workspace:^ is untouched', () => {
  const { newRange, changed } = transformRange('workspace:^', '2.0.0')
  assert.equal(newRange, 'workspace:^')
  assert.equal(changed, false)
})

test('transformRange: * is untouched', () => {
  const { newRange, changed } = transformRange('*', '2.0.0')
  assert.equal(newRange, '*')
  assert.equal(changed, false)
})

test('transformRange: changed:false when range already covers target', () => {
  const { newRange, changed } = transformRange('^1.0.0', '1.5.0')
  assert.equal(changed, false)
  assert.equal(newRange, '^1.0.0')
})

test('transformRange: idempotent — applying twice gives same result', () => {
  const first = transformRange('^1.0.0', '2.0.0')
  const second = transformRange(first.newRange, '2.0.0')
  assert.equal(second.newRange, first.newRange)
  assert.equal(second.changed, false)
})

// --- updatePackageJsonRange integration tests ---

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'pig-test-'))
}

function writePkg(dir: string, content: string): string {
  const p = join(dir, 'package.json')
  writeFileSync(p, content)
  return p
}

test('updates ^ dep in dependencies and preserves formatting', async () => {
  const dir = makeTmpDir()
  try {
    const original = `{\n  "dependencies": {\n    "lodash": "^1.0.0"\n  }\n}\n`
    const p = writePkg(dir, original)
    const { changed } = await updatePackageJsonRange(p, 'lodash', '2.0.0')
    assert.ok(changed)
    const result = readFileSync(p, 'utf8')
    assert.ok(result.includes('"^2.0.0"'))
    // Other structure preserved
    assert.ok(result.includes('"dependencies"'))
    // Trailing newline preserved
    assert.ok(result.endsWith('\n'))
  } finally { rmSync(dir, { recursive: true }) }
})

test('updates dep in devDependencies', async () => {
  const dir = makeTmpDir()
  try {
    const original = `{\n  "devDependencies": {\n    "typescript": "~5.0.0"\n  }\n}\n`
    const p = writePkg(dir, original)
    const { changed } = await updatePackageJsonRange(p, 'typescript', '5.9.3')
    assert.ok(changed)
    const result = readFileSync(p, 'utf8')
    assert.ok(result.includes('"~5.9.3"'))
  } finally { rmSync(dir, { recursive: true }) }
})

test('returns changed:false when range already covers target', async () => {
  const dir = makeTmpDir()
  try {
    const original = `{\n  "dependencies": {\n    "lodash": "^4.0.0"\n  }\n}\n`
    const p = writePkg(dir, original)
    const before = readFileSync(p, 'utf8')
    const { changed } = await updatePackageJsonRange(p, 'lodash', '4.17.21')
    assert.equal(changed, false)
    // File not modified
    assert.equal(readFileSync(p, 'utf8'), before)
  } finally { rmSync(dir, { recursive: true }) }
})

test('workspace:* range is left untouched', async () => {
  const dir = makeTmpDir()
  try {
    const original = `{\n  "dependencies": {\n    "my-lib": "workspace:*"\n  }\n}\n`
    const p = writePkg(dir, original)
    const { changed } = await updatePackageJsonRange(p, 'my-lib', '2.0.0')
    assert.equal(changed, false)
    assert.ok(readFileSync(p, 'utf8').includes('"workspace:*"'))
  } finally { rmSync(dir, { recursive: true }) }
})

test('returns changed:false when package not found in package.json', async () => {
  const dir = makeTmpDir()
  try {
    const original = `{\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}\n`
    const p = writePkg(dir, original)
    const { changed } = await updatePackageJsonRange(p, 'lodash', '4.17.21')
    assert.equal(changed, false)
  } finally { rmSync(dir, { recursive: true }) }
})
