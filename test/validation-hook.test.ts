import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runValidationHook, type HookOptions } from '../src/validation-hook.ts'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'pig-test-'))
}

// Create a minimal snapshot fixture
function makeProjectDir(dir: string, pkgContent: string, lockContent: string): void {
  writeFileSync(join(dir, 'package.json'), pkgContent)
  writeFileSync(join(dir, 'pnpm-lock.yaml'), lockContent)
}

// A runner that succeeds
const successRunner: HookOptions['runner'] = async () => ({ exitCode: 0, output: 'ok' })
// A runner that fails
const failRunner: HookOptions['runner'] = async () => ({ exitCode: 1, output: 'FAIL' })

test('returns success:true when hook exits 0', async () => {
  const dir = makeTmpDir()
  try {
    makeProjectDir(dir, '{}', 'lockfileVersion: "9.0"\n')
    const result = await runValidationHook({
      projectRoot: dir,
      hookCmd: 'echo ok',
      pkgSnapshot: '{}',
      lockSnapshot: 'lockfileVersion: "9.0"\n',
      runner: successRunner,
    })
    assert.equal(result.success, true)
  } finally { rmSync(dir, { recursive: true }) }
})

test('returns success:false when hook exits non-zero', async () => {
  const dir = makeTmpDir()
  try {
    makeProjectDir(dir, '{}', 'lockfileVersion: "9.0"\n')
    const result = await runValidationHook({
      projectRoot: dir,
      hookCmd: 'exit 1',
      pkgSnapshot: '{}',
      lockSnapshot: 'lockfileVersion: "9.0"\n',
      runner: failRunner,
    })
    assert.equal(result.success, false)
  } finally { rmSync(dir, { recursive: true }) }
})

test('reverts package.json and lockfile on failure', async () => {
  const dir = makeTmpDir()
  try {
    const originalPkg = '{"name":"before"}'
    const originalLock = 'lockfileVersion: "9.0"\n# original\n'
    // Write "after" content (simulating a change was already applied)
    writeFileSync(join(dir, 'package.json'), '{"name":"after"}')
    writeFileSync(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n# modified\n')

    await runValidationHook({
      projectRoot: dir,
      hookCmd: 'exit 1',
      pkgSnapshot: originalPkg,
      lockSnapshot: originalLock,
      runner: failRunner,
    })

    assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), originalPkg)
    assert.equal(readFileSync(join(dir, 'pnpm-lock.yaml'), 'utf8'), originalLock)
  } finally { rmSync(dir, { recursive: true }) }
})

test('does NOT revert files on success', async () => {
  const dir = makeTmpDir()
  try {
    const changedPkg = '{"name":"after"}'
    writeFileSync(join(dir, 'package.json'), changedPkg)
    writeFileSync(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n')

    await runValidationHook({
      projectRoot: dir,
      hookCmd: 'echo ok',
      pkgSnapshot: '{"name":"before"}',
      lockSnapshot: 'lockfileVersion: "9.0"\noriginal\n',
      runner: successRunner,
    })

    assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), changedPkg)
  } finally { rmSync(dir, { recursive: true }) }
})

test('result includes output from hook', async () => {
  const dir = makeTmpDir()
  try {
    makeProjectDir(dir, '{}', '')
    const runner: HookOptions['runner'] = async () => ({ exitCode: 0, output: 'tests passed' })
    const result = await runValidationHook({
      projectRoot: dir,
      hookCmd: 'echo',
      pkgSnapshot: '{}',
      lockSnapshot: '',
      runner,
    })
    assert.ok(result.output.includes('tests passed'))
  } finally { rmSync(dir, { recursive: true }) }
})

test('skipped:true when hookCmd is undefined (--no-validate)', async () => {
  const dir = makeTmpDir()
  try {
    makeProjectDir(dir, '{}', '')
    const result = await runValidationHook({
      projectRoot: dir,
      hookCmd: undefined,
      pkgSnapshot: '{}',
      lockSnapshot: '',
      runner: failRunner, // would fail if called
    })
    assert.equal(result.skipped, true)
    assert.equal(result.success, true)
  } finally { rmSync(dir, { recursive: true }) }
})
