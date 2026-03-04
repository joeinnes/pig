import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runPnpmInstall } from '../src/install-runner.ts'

// These tests use an injected runner to avoid real pnpm invocations.
// Acceptance criteria for the real runner (integration) are covered by the
// exported interface contract verified here.

type RunnerFn = (cwd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>

test('returns success:true on exit code 0', async () => {
  const runner: RunnerFn = async () => ({ exitCode: 0, stdout: 'added 1 package', stderr: '' })
  const result = await runPnpmInstall('/some/project', { runner })
  assert.equal(result.success, true)
})

test('returns success:false on non-zero exit code', async () => {
  const runner: RunnerFn = async () => ({ exitCode: 1, stdout: '', stderr: 'ERR something failed' })
  const result = await runPnpmInstall('/some/project', { runner })
  assert.equal(result.success, false)
})

test('output includes both stdout and stderr', async () => {
  const runner: RunnerFn = async () => ({ exitCode: 0, stdout: 'hello stdout', stderr: 'hello stderr' })
  const result = await runPnpmInstall('/some/project', { runner })
  assert.ok(result.output.includes('hello stdout'))
  assert.ok(result.output.includes('hello stderr'))
})

test('does not throw on non-zero exit (returns success:false)', async () => {
  const runner: RunnerFn = async () => ({ exitCode: 99, stdout: '', stderr: 'bad' })
  await assert.doesNotReject(runPnpmInstall('/any', { runner }))
})

test('does not throw on runner error (returns success:false)', async () => {
  const runner: RunnerFn = async () => { throw new Error('pnpm not found') }
  const result = await runPnpmInstall('/any', { runner })
  assert.equal(result.success, false)
  assert.ok(result.output.includes('pnpm not found'))
})

test('result has correct shape', async () => {
  const runner: RunnerFn = async () => ({ exitCode: 0, stdout: '', stderr: '' })
  const result = await runPnpmInstall('/project', { runner })
  assert.ok('success' in result)
  assert.ok('output' in result)
  assert.equal(typeof result.success, 'boolean')
  assert.equal(typeof result.output, 'string')
})
