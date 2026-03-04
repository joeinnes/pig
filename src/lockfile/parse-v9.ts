import yaml from 'js-yaml'
import type { ParsedLockfile, ResolvedPackage } from './types.ts'

/**
 * Parse a package key from a pnpm v9 lockfile snapshots: section.
 * Unlike v6, keys have no leading slash:
 *   lodash@4.17.21
 *   @scope/pkg@1.2.3
 *   react@18.2.0(react-dom@18.2.0)
 */
function parseSnapshotKey(key: string): ResolvedPackage | null {
  // Remove all trailing peer dep suffix groups e.g. (peer@1.0.0)(other@2.0.0)
  let k = key.replace(/(\([^)]*\))+$/, '').trim()
  // Find the last @ — separates name from version
  const atIdx = k.lastIndexOf('@')
  if (atIdx <= 0) return null
  const name = k.slice(0, atIdx)
  const version = k.slice(atIdx + 1)
  if (!name || !version) return null
  return { name, version }
}

export function parseV9(content: string, projectRoot: string): ParsedLockfile {
  const doc = yaml.load(content) as Record<string, unknown> | null

  if (!doc || typeof doc !== 'object') {
    return { lockfileVersion: '9.0', projectRoot, packages: [] }
  }

  const lockfileVersion = typeof doc.lockfileVersion === 'string'
    ? doc.lockfileVersion
    : '9.0'

  const snapshotsSection = doc.snapshots
  if (!snapshotsSection || typeof snapshotsSection !== 'object') {
    return { lockfileVersion, projectRoot, packages: [] }
  }

  const packages: ResolvedPackage[] = []
  for (const key of Object.keys(snapshotsSection as object)) {
    const parsed = parseSnapshotKey(key)
    if (parsed) packages.push(parsed)
  }

  return { lockfileVersion, projectRoot, packages }
}
