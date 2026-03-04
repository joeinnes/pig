import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ParsedLockfile } from './lockfile/types.ts'

export interface ProjectUsage {
  projectRoot: string
  resolvedVersion: string
  declaredRange: string | null
}

export interface VersionGroup {
  name: string
  versions: Map<string, ProjectUsage[]>
}

export type VersionGroupMap = Map<string, VersionGroup>

function readDeclaredRange(projectRoot: string, packageName: string): string | null {
  const pkgPath = join(projectRoot, 'package.json')
  if (!existsSync(pkgPath)) return null
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return (
      pkg.dependencies?.[packageName] ??
      pkg.devDependencies?.[packageName] ??
      pkg.peerDependencies?.[packageName] ??
      pkg.optionalDependencies?.[packageName] ??
      null
    )
  } catch {
    return null
  }
}

export function buildVersionGroupMap(lockfiles: ParsedLockfile[]): VersionGroupMap {
  // Deduplicate by projectRoot
  const seenRoots = new Set<string>()
  const unique = lockfiles.filter(lf => {
    if (seenRoots.has(lf.projectRoot)) return false
    seenRoots.add(lf.projectRoot)
    return true
  })

  // intermediate: packageName → version → ProjectUsage[]
  const intermediate = new Map<string, Map<string, ProjectUsage[]>>()

  for (const lockfile of unique) {
    // Track (packageName, version) pairs we've already added for this project
    // to deduplicate peer-dep variants that resolve to the same version
    const seenForProject = new Set<string>()

    for (const pkg of lockfile.packages) {
      const key = `${pkg.name}@${pkg.version}`
      if (seenForProject.has(key)) continue
      seenForProject.add(key)

      const declaredRange = readDeclaredRange(lockfile.projectRoot, pkg.name)

      let versionMap = intermediate.get(pkg.name)
      if (!versionMap) {
        versionMap = new Map()
        intermediate.set(pkg.name, versionMap)
      }

      let usages = versionMap.get(pkg.version)
      if (!usages) {
        usages = []
        versionMap.set(pkg.version, usages)
      }

      usages.push({ projectRoot: lockfile.projectRoot, resolvedVersion: pkg.version, declaredRange })
    }
  }

  // Only include packages with 2+ distinct resolved versions
  const result: VersionGroupMap = new Map()
  for (const [name, versions] of intermediate) {
    if (versions.size >= 2) {
      result.set(name, { name, versions })
    }
  }

  return result
}
