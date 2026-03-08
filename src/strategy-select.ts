import { select, isCancel } from '@clack/prompts'
import { fetchPackageVersions, clearRegistryCache } from './registry.ts'
import { alignmentCost } from './semver-utils.ts'
import type { VersionGroup } from './version-group-map.ts'
import type { StrategySuccess, StrategyError } from './strategies.ts'

export { clearRegistryCache as clearSelectCache }

export interface StrategyCancelled {
  type: 'cancelled'
  requiresNetwork: true
}

export type SelectStrategyResult = StrategySuccess | StrategyError | StrategyCancelled

type PickerItem = { label: string; value: string }
type PickerFn = (items: PickerItem[]) => Promise<PickerItem | symbol>

function defaultPicker(items: PickerItem[]): Promise<PickerItem | symbol> {
  return select({
    message: 'Select version to align to:',
    options: items.map(item => ({ value: item, label: item.label })),
  }) as Promise<PickerItem | symbol>
}

export async function strategySelectVersion(
  group: VersionGroup,
  registryUrl: string,
  options?: { fetcher?: typeof fetch; picker?: PickerFn }
): Promise<SelectStrategyResult> {
  const fetcher = options?.fetcher
  const picker = options?.picker ?? defaultPicker

  let versions: Awaited<ReturnType<typeof fetchPackageVersions>>
  try {
    versions = await fetchPackageVersions(group.name, registryUrl, fetcher ? { fetcher } : undefined)
  } catch (err) {
    return {
      type: 'error',
      message: `Failed to fetch versions for "${group.name}": ${err instanceof Error ? err.message : String(err)}`,
      requiresNetwork: true,
    }
  }

  const items: PickerItem[] = versions.map(v => {
    const date = v.publishedAt ? new Date(v.publishedAt).getFullYear().toString() : 'unknown date'
    const size = v.unpackedSize ? ` ${Math.round(v.unpackedSize / 1024)} KB` : ''
    return { label: `${v.version}  (${date})${size}`, value: v.version }
  })

  const selected = await picker(items)

  if (isCancel(selected) || typeof selected === 'symbol') {
    return { type: 'cancelled', requiresNetwork: true }
  }

  const targetVersion = (selected as PickerItem).value
  return {
    type: 'success',
    targetVersion,
    alignmentCost: alignmentCost(group, targetVersion),
    requiresNetwork: true,
  }
}
