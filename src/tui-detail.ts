import { select } from '@clack/prompts'
import { strategyAlignToLowest, strategyAlignToMostAcceptable, strategyAlignToProject } from './strategies.ts'
import { strategyUpgradeToLatest } from './strategy-latest.ts'
import { strategySelectVersion } from './strategy-select.ts'
import { alignmentCost } from './semver-utils.ts'
import type { VersionGroup } from './version-group-map.ts'
import type { PackageAction } from './tui-list.ts'

export type StrategyChoice =
  | 'lowest'
  | 'most-acceptable'
  | 'project'
  | 'latest'
  | 'specific'
  | 'skip'
  | 'defer'
  | 'quit'

export interface DetailOptions {
  strategyPicker: (group: VersionGroup) => Promise<StrategyChoice>
  projectPicker: (projectRoots: string[]) => Promise<string>
  registryUrl: string
  fetcher?: typeof fetch
  write: (line: string) => void
}

function defaultStrategyPicker(group: VersionGroup): Promise<StrategyChoice> {
  const candidates = [...group.versions.keys()]
  const projectRoots = [...new Set([...group.versions.values()].flatMap(u => u.map(x => x.projectRoot)))]
  const lines = candidates.map(v => {
    const cost = alignmentCost(group, v)
    return `${v}  (cost: ${cost})`
  }).join(', ')

  return select({
    message: `${group.name}: versions ${lines}`,
    options: [
      { value: 'lowest' as StrategyChoice, label: 'Align to lowest required' },
      { value: 'most-acceptable' as StrategyChoice, label: 'Align to most acceptable' },
      { value: 'project' as StrategyChoice, label: `Align to project X (${projectRoots.length} projects)` },
      { value: 'latest' as StrategyChoice, label: 'Upgrade to latest (registry)' },
      { value: 'specific' as StrategyChoice, label: 'Select specific version (registry)' },
      { value: 'skip' as StrategyChoice, label: 'Skip this package' },
      { value: 'defer' as StrategyChoice, label: 'Defer (come back later)' },
      { value: 'quit' as StrategyChoice, label: 'Quit session' },
    ],
  }) as unknown as Promise<StrategyChoice>
}

function defaultProjectPicker(projectRoots: string[]): Promise<string> {
  return select({
    message: 'Align to which project?',
    options: projectRoots.map(r => ({ value: r, label: r })),
  }) as unknown as Promise<string>
}

export async function showPackageDetail(
  group: VersionGroup,
  options?: Partial<DetailOptions>
): Promise<PackageAction> {
  const strategyPicker = options?.strategyPicker ?? defaultStrategyPicker
  const projectPicker = options?.projectPicker ?? defaultProjectPicker
  const registryUrl = options?.registryUrl ?? 'https://registry.npmjs.org'
  const fetcher = options?.fetcher
  const write = options?.write ?? ((s: string) => console.log(s))

  const choice = await strategyPicker(group)

  if (choice === 'skip' || choice === 'defer' || choice === 'quit') {
    return choice
  }

  let targetVersion: string | undefined

  if (choice === 'lowest') {
    const result = strategyAlignToLowest(group)
    targetVersion = result.targetVersion
  }

  else if (choice === 'most-acceptable') {
    const result = strategyAlignToMostAcceptable(group)
    if (result.type === 'tie') {
      // Tie: let user pick from tied candidates
      const tied = result.tiedCandidates
      write(`Tie detected — ${tied.length} candidates satisfy the same number of projects.`)
      const picked = await select({
        message: 'Choose version to align to:',
        options: tied.map(v => ({ value: v, label: v })),
      }) as unknown as string
      targetVersion = picked
    } else {
      targetVersion = result.targetVersion
    }
  }

  else if (choice === 'project') {
    const roots = [...new Set([...group.versions.values()].flatMap(u => u.map(x => x.projectRoot)))]
    const projectRoot = await projectPicker(roots)
    const result = strategyAlignToProject(group, projectRoot)
    if (result.type === 'error') {
      write(`Error: ${result.message}`)
      return 'skip'
    }
    targetVersion = result.targetVersion
  }

  else if (choice === 'latest') {
    const result = await strategyUpgradeToLatest(group, registryUrl, fetcher ? { fetcher } : undefined)
    if (result.type === 'error') {
      write(`Error: ${result.message}`)
      return 'skip'
    }
    targetVersion = result.targetVersion
  }

  else if (choice === 'specific') {
    const result = await strategySelectVersion(group, registryUrl, fetcher ? { fetcher } : undefined)
    if (result.type === 'error' || result.type === 'cancelled') return 'skip'
    targetVersion = result.targetVersion
  }

  if (!targetVersion) return 'skip'

  return { type: 'select', targetVersion }
}
