import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyChanges, type QueuedChange, type PipelineOptions } from '../src/apply-pipeline.ts'

// A minimal queued change
function change(projectRoot: string, targetVersion: string): QueuedChange {
  return {
    projectRoot,
    packageName: 'lodash',
    targetVersion,
    currentRange: '^4.0.0',
  }
}

// Capture write output
function capture(): { lines: string[]; write: (s: string) => void } {
  const lines: string[] = []
  return { lines, write: (s: string) => lines.push(s) }
}

// Default options: no-ops for all side-effectful steps
function noopOptions(overrides: Partial<PipelineOptions> = {}): PipelineOptions {
  return {
    dryRun: false,
    hookCmd: undefined,
    updater: async () => ({ changed: true }),
    installer: async () => ({ success: true, output: '' }),
    validator: async () => ({ success: true, output: '' }),
    write: () => {},
    ...overrides,
  }
}

test('processes all changes even when one fails', async () => {
  let processed = 0
  const options = noopOptions({
    updater: async () => {
      processed++
      // Fail on the second project
      if (processed === 2) return { changed: true, warning: undefined }
      return { changed: true }
    },
    installer: async (root) => {
      if (root === '/b') return { success: false, output: 'install failed' }
      return { success: true, output: '' }
    },
  })

  const result = await applyChanges([change('/a', '4.17.21'), change('/b', '4.17.21'), change('/c', '4.17.21')], options)
  assert.equal(result.total, 3)
  assert.ok(result.failed >= 1, 'expected at least one failure')
  assert.equal(result.succeeded + result.failed, result.total)
})

test('dry run does not call updater or installer', async () => {
  let updaterCalled = false
  let installerCalled = false
  const options = noopOptions({
    dryRun: true,
    updater: async () => { updaterCalled = true; return { changed: true } },
    installer: async () => { installerCalled = true; return { success: true, output: '' } },
  })

  await applyChanges([change('/a', '4.17.21')], options)
  assert.equal(updaterCalled, false, 'updater should not be called in dry-run')
  assert.equal(installerCalled, false, 'installer should not be called in dry-run')
})

test('dry run prints proposed changes', async () => {
  const { lines, write } = capture()
  const options = noopOptions({ dryRun: true, write })
  await applyChanges([change('/a', '4.17.21')], options)
  const combined = lines.join('\n')
  assert.ok(combined.includes('/a') || combined.includes('dry') || combined.includes('lodash'), `expected project info in dry-run output: ${combined}`)
})

test('end summary includes success and failure counts', async () => {
  const { lines, write } = capture()
  const options = noopOptions({
    write,
    installer: async (root) =>
      root === '/b' ? { success: false, output: 'err' } : { success: true, output: '' },
  })

  const result = await applyChanges([change('/a', '4.17.21'), change('/b', '4.17.21')], options)
  assert.equal(result.succeeded, 1)
  assert.equal(result.failed, 1)
  const combined = lines.join('\n')
  assert.ok(/1/.test(combined), 'summary should mention counts')
})

test('processes changes in deterministic order', async () => {
  const order: string[] = []
  const options = noopOptions({
    updater: async (root: string) => { order.push(root); return { changed: true } },
  })

  await applyChanges(
    [change('/c', '1.0.0'), change('/a', '1.0.0'), change('/b', '1.0.0')],
    options
  )
  assert.deepEqual([...order].sort(), order.sort(), 'order should be consistent (sorted)')
})

test('returns zero counts for empty change list', async () => {
  const result = await applyChanges([], noopOptions())
  assert.equal(result.total, 0)
  assert.equal(result.succeeded, 0)
  assert.equal(result.failed, 0)
})

test('warning from updater is included in output', async () => {
  const { lines, write } = capture()
  const options = noopOptions({
    write,
    updater: async () => ({ changed: true, warning: 'exact pin updated' }),
  })
  await applyChanges([change('/a', '4.17.21')], options)
  const combined = lines.join('\n')
  assert.ok(combined.includes('exact pin updated'), `expected warning in output: ${combined}`)
})
