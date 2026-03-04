import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runScan } from '../src/scan.ts'
import type { SessionConfig } from '../src/session-config.ts'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'pig-test-'))
}

function makeConfig(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    scanPaths: [],
    ignore: ['**/node_modules/**'],
    registryUrl: 'https://registry.npmjs.org',
    dryRun: false,
    ...overrides,
  }
}

// Minimal valid pnpm v9 lockfile with given packages
function lockfileV9(packages: Array<{ name: string; version: string }>): string {
  const entries = packages.map(p => `  ${p.name}@${p.version}: {}`).join('\n')
  return `lockfileVersion: '9.0'\n\nsnapshots:\n${entries}\n`
}

function capture(): { lines: string[]; write: (s: string) => void } {
  const lines: string[] = []
  return { lines, write: (s: string) => lines.push(s) }
}

test('prints three-line summary with correct project and package counts', async () => {
  const root = makeTmpDir()
  try {
    mkdirSync(join(root, 'projectA'))
    mkdirSync(join(root, 'projectB'))
    writeFileSync(
      join(root, 'projectA', 'pnpm-lock.yaml'),
      lockfileV9([{ name: 'lodash', version: '4.16.0' }, { name: 'react', version: '18.2.0' }])
    )
    writeFileSync(
      join(root, 'projectB', 'pnpm-lock.yaml'),
      lockfileV9([{ name: 'lodash', version: '4.17.21' }, { name: 'react', version: '18.2.0' }])
    )
    const { lines, write } = capture()
    await runScan(makeConfig({ scanPaths: [root] }), { write, storePath: '/nonexistent/store' })
    assert.equal(lines.length, 3, `expected 3 lines, got: ${JSON.stringify(lines)}`)
    assert.match(lines[0], /Found 2 projects across 1 scan path/)
    assert.match(lines[1], /1 package(s)? (has|have) multiple resolved versions/)
    assert.match(lines[2], /Estimated potential savings: ~/)
  } finally { rmSync(root, { recursive: true }) }
})

test('reports multiple scan paths in summary', async () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    writeFileSync(join(a, 'pnpm-lock.yaml'), lockfileV9([{ name: 'react', version: '17.0.2' }]))
    writeFileSync(join(b, 'pnpm-lock.yaml'), lockfileV9([{ name: 'react', version: '18.2.0' }]))
    const { lines, write } = capture()
    await runScan(makeConfig({ scanPaths: [a, b] }), { write, storePath: '/nonexistent/store' })
    assert.match(lines[0], /Found 2 projects across 2 scan paths/)
  } finally { rmSync(a, { recursive: true }); rmSync(b, { recursive: true }) }
})

test('reports 0 packages when all are at same version', async () => {
  const root = makeTmpDir()
  try {
    mkdirSync(join(root, 'a'))
    mkdirSync(join(root, 'b'))
    writeFileSync(join(root, 'a', 'pnpm-lock.yaml'), lockfileV9([{ name: 'lodash', version: '4.17.21' }]))
    writeFileSync(join(root, 'b', 'pnpm-lock.yaml'), lockfileV9([{ name: 'lodash', version: '4.17.21' }]))
    const { lines, write } = capture()
    await runScan(makeConfig({ scanPaths: [root] }), { write, storePath: '/nonexistent/store' })
    assert.match(lines[1], /0 packages? (has|have) multiple resolved versions/)
  } finally { rmSync(root, { recursive: true }) }
})

test('reports 0 projects when scan path is empty', async () => {
  const root = makeTmpDir()
  try {
    const { lines, write } = capture()
    await runScan(makeConfig({ scanPaths: [root] }), { write, storePath: '/nonexistent/store' })
    assert.match(lines[0], /Found 0 projects/)
  } finally { rmSync(root, { recursive: true }) }
})

test('savings line shows human-readable byte size', async () => {
  const root = makeTmpDir()
  try {
    writeFileSync(join(root, 'pnpm-lock.yaml'), lockfileV9([{ name: 'lodash', version: '4.17.21' }]))
    const { lines, write } = capture()
    await runScan(makeConfig({ scanPaths: [root] }), { write, storePath: '/nonexistent/store' })
    // Should not show raw bytes — must include B, KB, MB, or GB
    assert.match(lines[2], /~\d+(\.\d+)? (B|KB|MB|GB)/)
  } finally { rmSync(root, { recursive: true }) }
})

test('singular "scan path" when only one path given', async () => {
  const root = makeTmpDir()
  try {
    const { lines, write } = capture()
    await runScan(makeConfig({ scanPaths: [root] }), { write, storePath: '/nonexistent/store' })
    assert.match(lines[0], /1 scan path[^s]|1 scan path$/)
  } finally { rmSync(root, { recursive: true }) }
})

test('plural "scan paths" when multiple paths given', async () => {
  const a = makeTmpDir(), b = makeTmpDir()
  try {
    const { lines, write } = capture()
    await runScan(makeConfig({ scanPaths: [a, b] }), { write, storePath: '/nonexistent/store' })
    assert.match(lines[0], /2 scan paths/)
  } finally { rmSync(a, { recursive: true }); rmSync(b, { recursive: true }) }
})
