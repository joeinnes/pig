export interface QueuedChange {
  projectRoot: string
  packageName: string
  targetVersion: string
  currentRange: string
}

export interface PipelineOptions {
  dryRun: boolean
  hookCmd: string | undefined
  updater: (projectRoot: string, packageName: string, targetVersion: string) => Promise<{ changed: boolean; warning?: string }>
  installer: (projectRoot: string) => Promise<{ success: boolean; output: string }>
  validator: (projectRoot: string, hookCmd: string | undefined, pkgSnapshot: string, lockSnapshot: string) => Promise<{ success: boolean; output: string; skipped?: boolean }>
  write: (line: string) => void
}

export interface PipelineResult {
  total: number
  succeeded: number
  failed: number
}

export async function applyChanges(
  changes: QueuedChange[],
  options: PipelineOptions
): Promise<PipelineResult> {
  const { dryRun, hookCmd, updater, installer, validator, write } = options

  if (changes.length === 0) {
    return { total: 0, succeeded: 0, failed: 0 }
  }

  // Process in deterministic (sorted) order
  const sorted = [...changes].sort((a, b) => a.projectRoot.localeCompare(b.projectRoot))

  let succeeded = 0
  let failed = 0

  if (dryRun) {
    write('Dry run — no files will be modified.')
    write('')
    for (const c of sorted) {
      write(`  ${c.projectRoot}: ${c.packageName} ${c.currentRange} → ${c.targetVersion}`)
    }
    write('')
    return { total: sorted.length, succeeded: 0, failed: 0 }
  }

  for (const c of sorted) {
    write(`Updating ${c.projectRoot}...`)
    try {
      const { changed, warning } = await updater(c.projectRoot, c.packageName, c.targetVersion)
      if (warning) write(`  Warning: ${warning}`)

      if (!changed) {
        write(`  Already at target version, skipping install.`)
        succeeded++
        continue
      }

      const installResult = await installer(c.projectRoot)
      if (!installResult.success) {
        write(`  Install failed: ${installResult.output}`)
        failed++
        continue
      }

      // Validation hook (snapshot not tracked here — passed by caller in real use)
      const validationResult = await validator(c.projectRoot, hookCmd, '', '')
      if (!validationResult.success) {
        write(`  Validation failed: ${validationResult.output}`)
        failed++
        continue
      }

      write(`  Done.`)
      succeeded++
    } catch (err) {
      write(`  Error: ${err instanceof Error ? err.message : String(err)}`)
      failed++
    }
  }

  write('')
  write(`Complete: ${succeeded} succeeded, ${failed} failed out of ${sorted.length} projects.`)

  return { total: sorted.length, succeeded, failed }
}
