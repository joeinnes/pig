import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSessionConfig } from '../src/session-config.ts'
import type { PigConfig } from '../src/config.ts'
import { homedir } from 'node:os'
import { join } from 'node:path'

const base: PigConfig = {
  scanPaths: ['/existing/path'],
  ignore: ['**/node_modules/**'],
  validate: 'pnpm test',
  registryUrl: 'https://registry.npmjs.org',
}

test('no flags returns base config with dryRun false', () => {
  const cfg = buildSessionConfig([], base)
  assert.deepEqual(cfg.scanPaths, base.scanPaths)
  assert.equal(cfg.validate, base.validate)
  assert.equal(cfg.registryUrl, base.registryUrl)
  assert.equal(cfg.dryRun, false)
  assert.equal(cfg.strategy, undefined)
  assert.equal(cfg.package, undefined)
})

test('--dry-run sets dryRun true', () => {
  const cfg = buildSessionConfig(['--dry-run'], base)
  assert.equal(cfg.dryRun, true)
})

test('--paths overrides scanPaths (comma-separated)', () => {
  const cfg = buildSessionConfig(['--paths', '/a,/b,/c'], base)
  assert.deepEqual(cfg.scanPaths, ['/a', '/b', '/c'])
})

test('--paths expands ~ in each entry', () => {
  const cfg = buildSessionConfig(['--paths', '~/projects,/absolute'], base)
  assert.equal(cfg.scanPaths[0], join(homedir(), 'projects'))
  assert.equal(cfg.scanPaths[1], '/absolute')
  assert.ok(!cfg.scanPaths[0].startsWith('~'))
})

test('--validate overrides validate', () => {
  const cfg = buildSessionConfig(['--validate', 'pnpm test:ci'], base)
  assert.equal(cfg.validate, 'pnpm test:ci')
})

test('--no-validate disables validate even when base has one', () => {
  const cfg = buildSessionConfig(['--no-validate'], base)
  assert.equal(cfg.validate, undefined)
})

test('--no-validate takes precedence over --validate', () => {
  const cfg = buildSessionConfig(['--validate', 'pnpm test', '--no-validate'], base)
  assert.equal(cfg.validate, undefined)
})

test('--strategy sets strategy', () => {
  const cfg = buildSessionConfig(['--strategy', 'lowest'], base)
  assert.equal(cfg.strategy, 'lowest')
})

test('--package sets package', () => {
  const cfg = buildSessionConfig(['--package', 'lodash'], base)
  assert.equal(cfg.package, 'lodash')
})

test('unknown flag throws an error', () => {
  assert.throws(
    () => buildSessionConfig(['--unknown-flag'], base),
    (err: unknown) => {
      assert.ok(err instanceof Error)
      assert.match(err.message, /unknown|unrecognized|--unknown-flag/i)
      return true
    }
  )
})

test('base config values are preserved when no overriding flags given', () => {
  const cfg = buildSessionConfig(['--dry-run'], base)
  assert.equal(cfg.validate, base.validate)
  assert.deepEqual(cfg.scanPaths, base.scanPaths)
  assert.equal(cfg.registryUrl, base.registryUrl)
  assert.deepEqual(cfg.ignore, base.ignore)
})
