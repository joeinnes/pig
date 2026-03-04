import semver from 'semver'
import { alignmentCost, rangeIncludes } from './semver-utils.ts'
import type { VersionGroup } from './version-group-map.ts'

// Common fields shared by all strategy results
interface BaseResult {
  requiresNetwork: boolean
  alignmentCost: number
}

export interface StrategySuccess extends BaseResult {
  type: 'success'
  targetVersion: string
}

export interface StrategyTie extends BaseResult {
  type: 'tie'
  tiedCandidates: string[]
}

export interface StrategyError {
  type: 'error'
  message: string
  requiresNetwork: boolean
}

export type StrategyResult = StrategySuccess | StrategyTie | StrategyError

// Collect all distinct resolved versions from a group
function allVersions(group: VersionGroup): string[] {
  return [...group.versions.keys()]
}

// ---- align to lowest ----

export function strategyAlignToLowest(group: VersionGroup): StrategySuccess {
  const versions = allVersions(group)
  const lowest = versions.sort((a, b) => semver.compare(a, b))[0]
  return {
    type: 'success',
    targetVersion: lowest,
    alignmentCost: alignmentCost(group, lowest),
    requiresNetwork: false,
  }
}

// ---- align to project X ----

export function strategyAlignToProject(
  group: VersionGroup,
  projectRoot: string
): StrategySuccess | StrategyError {
  // Find which version this project has
  for (const [version, usages] of group.versions) {
    if (usages.some(u => u.projectRoot === projectRoot)) {
      return {
        type: 'success',
        targetVersion: version,
        alignmentCost: alignmentCost(group, version),
        requiresNetwork: false,
      }
    }
  }
  return {
    type: 'error',
    message: `Project "${projectRoot}" is not in the version group for "${group.name}"`,
    requiresNetwork: false,
  }
}

// ---- align to most acceptable ----

export function strategyAlignToMostAcceptable(group: VersionGroup): StrategySuccess | StrategyTie {
  const candidates = allVersions(group)

  // For each candidate, count how many project usages have a range that covers it
  const scores = candidates.map(candidate => {
    let satisfiedCount = 0
    for (const usages of group.versions.values()) {
      for (const usage of usages) {
        if (usage.declaredRange !== null && rangeIncludes(usage.declaredRange, candidate)) {
          satisfiedCount++
        }
      }
    }
    return { candidate, satisfiedCount }
  })

  // Find the maximum satisfied count
  const maxScore = Math.max(...scores.map(s => s.satisfiedCount))
  const topCandidates = scores.filter(s => s.satisfiedCount === maxScore).map(s => s.candidate)

  if (topCandidates.length === 1) {
    const winner = topCandidates[0]
    return {
      type: 'success',
      targetVersion: winner,
      alignmentCost: alignmentCost(group, winner),
      requiresNetwork: false,
    }
  }

  // Multiple candidates with same score — check if they satisfy the exact same set of projects
  // If so, pick highest semver. Otherwise, it's a genuine tie.
  const satisfiedSets = topCandidates.map(candidate => {
    const set = new Set<string>()
    for (const usages of group.versions.values()) {
      for (const usage of usages) {
        if (usage.declaredRange !== null && rangeIncludes(usage.declaredRange, candidate)) {
          set.add(usage.projectRoot)
        }
      }
    }
    return { candidate, set }
  })

  // Compare sets — if all candidates cover exactly the same set of projects, pick highest semver
  const firstSet = satisfiedSets[0].set
  const allSame = satisfiedSets.every(({ set }) => {
    if (set.size !== firstSet.size) return false
    for (const p of set) { if (!firstSet.has(p)) return false }
    return true
  })

  if (allSame) {
    const winner = topCandidates.sort((a, b) => semver.rcompare(a, b))[0]
    return {
      type: 'success',
      targetVersion: winner,
      alignmentCost: alignmentCost(group, winner),
      requiresNetwork: false,
    }
  }

  // Genuine tie — different candidates satisfy different project subsets
  return {
    type: 'tie',
    tiedCandidates: topCandidates,
    alignmentCost: 0,
    requiresNetwork: false,
  }
}
