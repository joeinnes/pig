import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import type { VersionGroupMap } from './version-group-map.ts'

export interface StoreSavingsResult {
  estimatedSavingsBytes: number
  storeFound: boolean
}

function resolveStorePath(storePath?: string): string | null {
  if (storePath !== undefined) return storePath
  try {
    return execSync('pnpm store path', { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

// The pnpm v10 store uses content-addressable storage: all package files are
// stored by content hash under {store}/files/, with no per-package or
// per-version directory structure. Accurate per-version size calculation
// would require pnpm's internal refcount metadata, which is not exposed.
//
// estimatedSavingsBytes is therefore 0 until a registry-based size estimation
// (using tarball sizes from T012) is implemented.
export async function estimateStoreSavings(
  _versionGroupMap: VersionGroupMap,
  storePath?: string
): Promise<StoreSavingsResult> {
  const resolved = resolveStorePath(storePath)

  if (!resolved) {
    return { estimatedSavingsBytes: 0, storeFound: false }
  }

  const filesDir = join(resolved, 'files')
  if (!existsSync(filesDir)) {
    return { estimatedSavingsBytes: 0, storeFound: false }
  }

  return { estimatedSavingsBytes: 0, storeFound: true }
}
