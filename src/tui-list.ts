import { select } from '@clack/prompts'
import type { VersionGroupMap, VersionGroup, ProjectUsage } from './version-group-map.ts'
import type { QueuedChange } from './apply-pipeline.ts'

export type PackageAction =
  | 'skip'
  | 'defer'
  | 'quit'
  | { type: 'select'; targetVersion: string }

export interface ListSessionOptions {
  picker: (group: VersionGroup) => Promise<PackageAction>
  write: (line: string) => void
}

export interface ListSessionResult {
  queue: QueuedChange[]
  quit: boolean
}

function defaultPicker(group: VersionGroup): Promise<PackageAction> {
  const versionCount = group.versions.size
  const projectCount = [...group.versions.values()].reduce((n, u) => n + u.length, 0)

  return select({
    message: `${group.name}  (${versionCount} versions across ${projectCount} projects)`,
    options: [
      ...([...group.versions.keys()].map(v => ({
        value: { type: 'select' as const, targetVersion: v },
        label: `Align to ${v}`,
      }))),
      { value: 'skip' as const, label: 'Skip (keep current versions)' },
      { value: 'defer' as const, label: 'Defer (come back later)' },
      { value: 'quit' as const, label: 'Quit session' },
    ],
  }) as Promise<PackageAction>
}

// Build a QueuedChange for each project that uses a different version than target
function buildChanges(group: VersionGroup, targetVersion: string): QueuedChange[] {
  const changes: QueuedChange[] = []
  for (const [, usages] of group.versions) {
    for (const usage of usages) {
      if (usage.resolvedVersion !== targetVersion) {
        changes.push({
          projectRoot: usage.projectRoot,
          packageName: group.name,
          targetVersion,
          currentRange: usage.declaredRange ?? usage.resolvedVersion,
        })
      }
    }
  }
  return changes
}

export async function runPackageListSession(
  versionGroupMap: VersionGroupMap,
  options?: Partial<ListSessionOptions>
): Promise<ListSessionResult> {
  const picker = options?.picker ?? defaultPicker
  const write = options?.write ?? ((s: string) => console.log(s))

  const queue: QueuedChange[] = []
  // Working list: packages yet to be processed (may grow via defer)
  const pending: VersionGroup[] = [...versionGroupMap.values()]

  let quit = false

  while (pending.length > 0) {
    const group = pending.shift()!
    const action = await picker(group)

    if (action === 'skip') {
      write(`Skipped ${group.name}.`)
      continue
    }

    if (action === 'defer') {
      pending.push(group) // re-append to end
      continue
    }

    if (action === 'quit') {
      quit = true
      break
    }

    if (typeof action === 'object' && action.type === 'select') {
      const changes = buildChanges(group, action.targetVersion)
      queue.push(...changes)
      write(`Queued ${group.name} → ${action.targetVersion} (${changes.length} projects).`)
    }
  }

  return { queue, quit }
}
