import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadGlobalConfig, loadProjectConfig } from '../src/config.ts'

function makeTmpDir(): string {
  const dir = join(tmpdir(), `pig-test-${process.pid}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

test('missing ~/.pig/config.json returns defaults', () => {
  const dir = makeTmpDir()
  try {
    const cfg = loadGlobalConfig(join(dir, 'config.json'))
    assert.deepEqual(cfg.scanPaths, [])
    assert.deepEqual(cfg.ignore, ['**/node_modules/**'])
    assert.equal(cfg.registryUrl, 'https://registry.npmjs.org')
    assert.equal(cfg.validate, undefined)
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('parses ~/.pig/config.json', () => {
  const dir = makeTmpDir()
  try {
    const configPath = join(dir, 'config.json')
    writeFileSync(configPath, JSON.stringify({
      scanPaths: ['/projects', '/work'],
      ignore: ['**/archived/**'],
      validate: 'pnpm test',
      registryUrl: 'https://my.registry.com',
    }))
    const cfg = loadGlobalConfig(configPath)
    assert.deepEqual(cfg.scanPaths, ['/projects', '/work'])
    assert.deepEqual(cfg.ignore, ['**/archived/**'])
    assert.equal(cfg.validate, 'pnpm test')
    assert.equal(cfg.registryUrl, 'https://my.registry.com')
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('invalid config.json throws error with file path', () => {
  const dir = makeTmpDir()
  try {
    const configPath = join(dir, 'config.json')
    writeFileSync(configPath, '{ not valid json }}}')
    assert.throws(
      () => loadGlobalConfig(configPath),
      (err: unknown) => {
        assert.ok(err instanceof Error)
        assert.ok(
          err.message.includes(configPath),
          `expected path "${configPath}" in error: ${err.message}`
        )
        return true
      }
    )
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('expands ~ in scanPaths', () => {
  const dir = makeTmpDir()
  try {
    const configPath = join(dir, 'config.json')
    writeFileSync(configPath, JSON.stringify({ scanPaths: ['~/projects', '/absolute'] }))
    const cfg = loadGlobalConfig(configPath)
    assert.ok(!cfg.scanPaths[0].startsWith('~'), `expected ~ expanded, got: ${cfg.scanPaths[0]}`)
    assert.ok(cfg.scanPaths[0].startsWith('/'), `expected absolute path, got: ${cfg.scanPaths[0]}`)
    assert.equal(cfg.scanPaths[1], '/absolute')
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('expands ~ in ignore patterns', () => {
  const dir = makeTmpDir()
  try {
    const configPath = join(dir, 'config.json')
    writeFileSync(configPath, JSON.stringify({ ignore: ['~/work/legacy'] }))
    const cfg = loadGlobalConfig(configPath)
    assert.ok(!cfg.ignore[0].startsWith('~'), `expected ~ expanded, got: ${cfg.ignore[0]}`)
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('per-project .pig.json validate overrides global', () => {
  const dir = makeTmpDir()
  try {
    writeFileSync(join(dir, '.pig.json'), JSON.stringify({ validate: 'pnpm test:unit' }))
    const proj = loadProjectConfig(dir)
    assert.equal(proj.validate, 'pnpm test:unit')
  } finally {
    rmSync(dir, { recursive: true })
  }
})

test('missing .pig.json returns empty project config', () => {
  const dir = makeTmpDir()
  try {
    const proj = loadProjectConfig(dir)
    assert.equal(proj.validate, undefined)
  } finally {
    rmSync(dir, { recursive: true })
  }
})
