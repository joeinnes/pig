import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface HookResult {
  success: boolean
  skipped?: boolean
  output: string
}

type RunnerFn = (cmd: string, cwd: string) => Promise<{ exitCode: number; output: string }>

export interface HookOptions {
  projectRoot: string
  hookCmd: string | undefined
  pkgSnapshot: string
  lockSnapshot: string
  runner?: RunnerFn
}

function defaultRunner(cmd: string, cwd: string): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve) => {
    const { spawn } = require('node:child_process') as typeof import('node:child_process')
    const child = spawn('sh', ['-c', cmd], { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout?.on('data', (d: Buffer) => { output += d.toString() })
    child.stderr?.on('data', (d: Buffer) => { output += d.toString() })
    child.on('close', (code: number | null) => {
      resolve({ exitCode: code ?? 1, output })
    })
  })
}

export async function runValidationHook(options: HookOptions): Promise<HookResult> {
  const { projectRoot, hookCmd, pkgSnapshot, lockSnapshot, runner = defaultRunner } = options

  if (!hookCmd) {
    return { success: true, skipped: true, output: '' }
  }

  const { exitCode, output } = await runner(hookCmd, projectRoot)

  if (exitCode !== 0) {
    // Revert both files atomically (write both regardless of individual errors)
    await Promise.all([
      writeFile(join(projectRoot, 'package.json'), pkgSnapshot, 'utf8'),
      writeFile(join(projectRoot, 'pnpm-lock.yaml'), lockSnapshot, 'utf8'),
    ])
    return { success: false, output }
  }

  return { success: true, output }
}
