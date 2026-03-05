import { parseArgs } from 'node:util'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { PigConfig } from './config.ts'

export interface SessionConfig extends PigConfig {
  strategy?: string
  package?: string
  dryRun: boolean
}

function expandHome(p: string): string {
  return p.startsWith('~/') ? join(homedir(), p.slice(2)) : p
}

export function buildSessionConfig(args: string[], base: PigConfig): SessionConfig {
  const { values } = parseArgs({
    args,
    options: {
      'dry-run': { type: 'boolean', default: false },
      'package': { type: 'string' },
      'strategy': { type: 'string' },
      'validate': { type: 'string' },
      'no-validate': { type: 'boolean', default: false },
      'paths': { type: 'string' },
      'help': { type: 'boolean', short: 'h', default: false },
      'version': { type: 'boolean', short: 'v', default: false },
    },
    allowPositionals: true,
    strict: true,
  })

  const noValidate = values['no-validate'] ?? false

  return {
    ...base,
    scanPaths: values.paths
      ? values.paths.split(',').map(p => expandHome(p.trim()))
      : base.scanPaths,
    validate: noValidate ? undefined : (values.validate ?? base.validate),
    strategy: values.strategy,
    package: values.package,
    dryRun: values['dry-run'] ?? false,
  }
}
