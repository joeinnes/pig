import { spawn } from 'node:child_process'

export interface InstallResult {
  success: boolean
  output: string
}

type RunnerFn = (cwd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>

const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

function defaultRunner(cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['install', '--frozen-lockfile=false'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`pnpm install timed out after ${TIMEOUT_MS / 1000}s in ${cwd}`))
    }, TIMEOUT_MS)

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ exitCode: code ?? 1, stdout, stderr })
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

export async function runPnpmInstall(
  cwd: string,
  options?: { runner?: RunnerFn }
): Promise<InstallResult> {
  const runner = options?.runner ?? defaultRunner
  try {
    const { exitCode, stdout, stderr } = await runner(cwd)
    const output = [stdout, stderr].filter(Boolean).join('\n')
    return { success: exitCode === 0, output }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, output: message }
  }
}
