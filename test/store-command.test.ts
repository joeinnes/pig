import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runStore } from '../src/store-command.ts'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'pig-test-'))
}

function capture(): { lines: string[]; write: (s: string) => void } {
  const lines: string[] = []
  return { lines, write: (s: string) => lines.push(s) }
}

test('reports store not found when path does not exist', async () => {
  const { lines, write } = capture()
  await runStore('/nonexistent/store/path', { write })
  assert.ok(lines.some(l => /not found|unavailable|no store/i.test(l)))
})

test('shows store path in output', async () => {
  const dir = makeTmpDir()
  try {
    mkdirSync(join(dir, 'files'))
    const { lines, write } = capture()
    await runStore(dir, { write })
    assert.ok(lines.some(l => l.includes(dir)), `expected store path in output, got: ${JSON.stringify(lines)}`)
  } finally { rmSync(dir, { recursive: true }) }
})

test('shows total size in human-readable format', async () => {
  const dir = makeTmpDir()
  try {
    mkdirSync(join(dir, 'files'))
    writeFileSync(join(dir, 'files', 'abc123'), 'x'.repeat(1024))
    const { lines, write } = capture()
    await runStore(dir, { write })
    assert.ok(
      lines.some(l => /\d+(\.\d+)? (B|KB|MB|GB)/.test(l)),
      `expected human-readable size in output, got: ${JSON.stringify(lines)}`
    )
  } finally { rmSync(dir, { recursive: true }) }
})

test('shows file count', async () => {
  const dir = makeTmpDir()
  try {
    mkdirSync(join(dir, 'files', '00'), { recursive: true })
    writeFileSync(join(dir, 'files', '00', 'aabbcc'), '')
    writeFileSync(join(dir, 'files', '00', 'ddeeff'), '')
    const { lines, write } = capture()
    await runStore(dir, { write })
    assert.ok(
      lines.some(l => /\d+ files?/.test(l)),
      `expected file count in output, got: ${JSON.stringify(lines)}`
    )
  } finally { rmSync(dir, { recursive: true }) }
})

test('exits cleanly (no throw) when store not found', async () => {
  const { write } = capture()
  await assert.doesNotReject(runStore('/nonexistent/path', { write }))
})
