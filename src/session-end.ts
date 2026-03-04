import { confirm } from '@clack/prompts'
import type { QueuedChange, PipelineResult } from './apply-pipeline.ts'

export interface SessionEndOptions {
  confirmer: () => Promise<boolean>
  applyFn: (queue: QueuedChange[]) => Promise<PipelineResult>
  write: (line: string) => void
}

export interface SessionEndResult {
  applied: boolean
  pipelineResult?: PipelineResult
}

function defaultConfirmer(): Promise<boolean> {
  return confirm({ message: 'Apply all queued changes?' }) as Promise<boolean>
}

export async function runSessionEnd(
  queue: QueuedChange[],
  options?: Partial<SessionEndOptions>
): Promise<SessionEndResult> {
  const confirmer = options?.confirmer ?? defaultConfirmer
  const applyFn = options?.applyFn
  const write = options?.write ?? ((s: string) => console.log(s))

  if (queue.length === 0) {
    write('No changes queued. Exiting.')
    return { applied: false }
  }

  write(`\n${queue.length} change${queue.length === 1 ? '' : 's'} queued.`)

  const shouldApply = await confirmer()
  if (!shouldApply) {
    write('Changes discarded. No files modified.')
    return { applied: false }
  }

  if (!applyFn) {
    write('No apply function provided.')
    return { applied: false }
  }

  const pipelineResult = await applyFn(queue)
  return { applied: true, pipelineResult }
}
