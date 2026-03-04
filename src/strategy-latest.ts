import { alignmentCost } from './semver-utils.ts'
import type { VersionGroup } from './version-group-map.ts'
import type { StrategySuccess, StrategyError } from './strategies.ts'

// Session cache for dist-tags responses
const distTagCache = new Map<string, Record<string, string>>()

export function clearStrategyLatestCache(): void {
  distTagCache.clear()
}

async function fetchDistTags(
  name: string,
  registryUrl: string,
  fetcher: typeof fetch
): Promise<Record<string, string>> {
  const cacheKey = `${registryUrl}/${name}`
  if (distTagCache.has(cacheKey)) return distTagCache.get(cacheKey)!

  const url = `${registryUrl}/${encodeURIComponent(name)}`
  const response = await fetcher(url, {
    headers: { Accept: 'application/vnd.npm.install-v1+json' },
  })

  if (!response.ok) {
    throw new Error(`Registry fetch failed for "${name}": HTTP ${response.status}`)
  }

  const data = await response.json() as Record<string, unknown>
  const tags = (data['dist-tags'] ?? {}) as Record<string, string>
  distTagCache.set(cacheKey, tags)
  return tags
}

export async function strategyUpgradeToLatest(
  group: VersionGroup,
  registryUrl: string,
  options?: { fetcher?: typeof fetch }
): Promise<StrategySuccess | StrategyError> {
  const fetcher = options?.fetcher ?? fetch

  let distTags: Record<string, string>
  try {
    distTags = await fetchDistTags(group.name, registryUrl, fetcher)
  } catch (err) {
    return {
      type: 'error',
      message: `Failed to fetch registry metadata for "${group.name}": ${err instanceof Error ? err.message : String(err)}`,
      requiresNetwork: true,
    }
  }

  const latest = distTags.latest
  if (!latest) {
    return {
      type: 'error',
      message: `No "latest" dist-tag found for "${group.name}"`,
      requiresNetwork: true,
    }
  }

  return {
    type: 'success',
    targetVersion: latest,
    alignmentCost: alignmentCost(group, latest),
    requiresNetwork: true,
  }
}
