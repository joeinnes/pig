import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const entry = join(root, 'dist', 'index.js')

function runPig(...args: string[]) {
  return spawnSync(process.execPath, [entry, ...args], {
    encoding: 'utf8',
    cwd: root,
  })
}

test('dist/index.js exists (run pnpm build first)', () => {
  assert.ok(existsSync(entry), `${entry} not found — run pnpm build`)
})

test('pig --help exits 0', () => {
  const { status } = runPig('--help')
  assert.equal(status, 0)
})

test('pig --help lists scan and store subcommands', () => {
  const { stdout, stderr } = runPig('--help')
  const out = stdout + stderr
  assert.match(out, /scan/, 'expected "scan" in --help output')
  assert.match(out, /store/, 'expected "store" in --help output')
})

test('pig --help lists all global flags', () => {
  const { stdout, stderr } = runPig('--help')
  const out = stdout + stderr
  for (const flag of ['--dry-run', '--package', '--strategy', '--validate', '--no-validate', '--paths']) {
    assert.match(out, new RegExp(flag.replace('-', '\\-')), `expected "${flag}" in --help output`)
  }
})

test('pig with no args exits 0', () => {
  const { status } = runPig()
  assert.equal(status, 0)
})

test('pig scan --help exits 0 and mentions scan', () => {
  const { status, stdout, stderr } = runPig('scan', '--help')
  assert.equal(status, 0)
  assert.match(stdout + stderr, /scan/)
})

test('pig store --help exits 0 and mentions store', () => {
  const { status, stdout, stderr } = runPig('store', '--help')
  assert.equal(status, 0)
  assert.match(stdout + stderr, /store/)
})

test('package.json only has allowed runtime dependencies', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const deps = Object.keys(pkg.dependencies ?? {})
  const allowed = new Set(['@clack/prompts', 'js-yaml', 'semver'])
  for (const dep of deps) {
    assert.ok(allowed.has(dep), `Unexpected runtime dep: ${dep}`)
  }
})
