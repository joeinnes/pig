import semver from 'semver'
import type { VersionGroup } from './version-group-map.ts'

// workspace: prefixed ranges mean "use the local workspace version", which
// always satisfies whatever version is resolved.
function isWorkspaceRange(range: string): boolean {
  return range.startsWith('workspace:')
}

export function rangeIncludes(range: string, version: string): boolean {
  if (isWorkspaceRange(range)) return true
  return semver.satisfies(version, range, { includePrerelease: false })
}

export function alignmentCost(group: VersionGroup, candidateVersion: string): number {
  let cost = 0
  for (const usages of group.versions.values()) {
    for (const usage of usages) {
      if (usage.declaredRange === null || !rangeIncludes(usage.declaredRange, candidateVersion)) {
        cost++
      }
    }
  }
  return cost
}
