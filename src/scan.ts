import { walkScanPaths } from './scan-walker.ts'
import { parseLockfile } from './lockfile/index.ts'
import { buildVersionGroupMap } from './version-group-map.ts'
import { estimateStoreSavings } from './store-savings.ts'
import { formatBytes } from './format-bytes.ts'
import type { SessionConfig } from './session-config.ts'

export interface ScanOptions {
  write?: (line: string) => void
  storePath?: string
}

function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return n === 1 ? singular : pluralForm
}

export async function runScan(config: SessionConfig, options: ScanOptions = {}): Promise<void> {
  const write = options.write ?? ((s: string) => console.log(s))

  const discovered = await walkScanPaths(config.scanPaths, config.ignore)

  const lockfiles = await Promise.all(
    discovered.map(d => parseLockfile(d.lockfilePath))
  )

  const versionGroupMap = buildVersionGroupMap(lockfiles)

  const { estimatedSavingsBytes } = await estimateStoreSavings(
    versionGroupMap,
    options.storePath
  )

  const projectCount = discovered.length
  const pathCount = config.scanPaths.length
  const packageCount = versionGroupMap.size

  write(
    `Found ${projectCount} ${plural(projectCount, 'project')} across ` +
    `${pathCount} ${plural(pathCount, 'scan path')}`
  )
  write(
    `${packageCount} ${plural(packageCount, 'package')} ` +
    `${packageCount === 1 ? 'has' : 'have'} multiple resolved versions`
  )
  write(`Estimated potential savings: ~${formatBytes(estimatedSavingsBytes)}`)
}
