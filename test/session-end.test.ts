import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runSessionEnd, type SessionEndOptions } from '../src/session-end.ts'
import type { QueuedChange } from '../src/apply-pipeline.ts'

function change(root: string): QueuedChange {
  return { projectRoot: root, packageName: 'lodash', targetVersion: '4.17.21', currentRange: '^4.0.0' }
}

function opts(confirm: boolean, overrides: Partial<SessionEndOptions> = {}): SessionEndOptions {
  return {
    confirmer: async () => confirm,
    applyFn: async () => ({ total: 0, succeeded: 0, failed: 0 }),
    write: () => {},
    ...overrides,
  }
}

test('exits cleanly with empty queue without prompting', async () => {
  let prompted = false
  const result = await runSessionEnd([], opts(true, {
    confirmer: async () => { prompted = true; return true },
  }))
  assert.equal(prompted, false, 'should not prompt when queue is empty')
  assert.equal(result.applied, false)
})

test('prompts apply/discard when queue has items', async () => {
  let prompted = false
  await runSessionEnd([change('/a')], opts(true, {
    confirmer: async () => { prompted = true; return true },
    applyFn: async () => ({ total: 1, succeeded: 1, failed: 0 }),
  }))
  assert.ok(prompted)
})

test('apply calls applyFn with queue', async () => {
  let receivedQueue: QueuedChange[] = []
  await runSessionEnd([change('/a'), change('/b')], opts(true, {
    confirmer: async () => true,
    applyFn: async (q) => { receivedQueue = q; return { total: q.length, succeeded: q.length, failed: 0 } },
  }))
  assert.equal(receivedQueue.length, 2)
})

test('discard does not call applyFn', async () => {
  let applyCalled = false
  const result = await runSessionEnd([change('/a')], opts(false, {
    applyFn: async () => { applyCalled = true; return { total: 0, succeeded: 0, failed: 0 } },
  }))
  assert.equal(applyCalled, false)
  assert.equal(result.applied, false)
})

test('returns applied:true when changes applied', async () => {
  const result = await runSessionEnd([change('/a')], opts(true, {
    applyFn: async () => ({ total: 1, succeeded: 1, failed: 0 }),
  }))
  assert.equal(result.applied, true)
})

test('returns pipelineResult when applied', async () => {
  const result = await runSessionEnd([change('/a')], opts(true, {
    applyFn: async () => ({ total: 1, succeeded: 1, failed: 0 }),
  }))
  assert.ok(result.pipelineResult)
  assert.equal(result.pipelineResult!.succeeded, 1)
})
