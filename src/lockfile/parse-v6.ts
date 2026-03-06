import yaml from 'js-yaml'
import type { ParsedLockfile, ResolvedPackage } from './types.ts'

/**
 * Parse a package key from a pnpm v6 lockfile packages: section.
 * Keys look like:
 *   /lodash@4.17.21:
 *   /@scope/pkg@1.2.3:
 *   /react@18.2.0(react-dom@18.2.0)(react-native@0.74.0):
 */
function parsePackageKey(key: string): ResolvedPackage | null {
  // Strip leading slash
  let k = key.startsWith('/') ? key.slice(1) : key
  // Remove all trailing peer dep suffix groups e.g. (peer@1.0.0)(other@2.0.0)
  k = k.replace(/(\([^)]*\))+$/, '').trim()
  // Find the last @ — separates name from version
  const atIdx = k.lastIndexOf('@')
  if (atIdx <= 0) return null
  const name = k.slice(0, atIdx)
  const version = k.slice(atIdx + 1)
  if (!name || !version) return null
  return { name, version }
}

export function parseV6(content: string, projectRoot: string): ParsedLockfile {
  const doc = yaml.load(content) as Record<string, unknown> | null

  if (!doc || typeof doc !== 'object') {
    return { lockfileVersion: '6.0', projectRoot, packages: [] }
  }

  const lockfileVersion = typeof doc.lockfileVersion === 'string'
    ? doc.lockfileVersion
    : '6.0'

  const packagesSection = doc.packages
  if (!packagesSection || typeof packagesSection !== 'object') {
    return { lockfileVersion, projectRoot, packages: [] }
  }

  const packages: ResolvedPackage[] = []
  for (const key of Object.keys(packagesSection as object)) {
    const parsed = parsePackageKey(key)
    if (parsed) packages.push(parsed)
  }

  return { lockfileVersion, projectRoot, packages }
}
