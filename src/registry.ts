import semver from 'semver'

export interface RegistryVersion {
  version: string
  publishedAt: string | null
  unpackedSize: number | null
}

// Module-level session cache keyed by `${registryUrl}/${name}`
const cache = new Map<string, RegistryVersion[]>()

export function clearRegistryCache(): void {
  cache.clear()
}

export async function fetchPackageVersions(
  name: string,
  registryUrl: string,
  options?: { fetcher?: typeof fetch }
): Promise<RegistryVersion[]> {
  const cacheKey = `${registryUrl}/${name}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  const fetcher = options?.fetcher ?? fetch
  const url = `${registryUrl}/${encodeURIComponent(name)}`

  let response: { ok: boolean; status: number; json(): Promise<unknown> }
  try {
    response = await fetcher(url, {
      headers: { Accept: 'application/vnd.npm.install-v1+json' },
    }) as typeof response
  } catch (err) {
    throw new Error(
      `Registry fetch failed for "${name}": ${err instanceof Error ? err.message : String(err)}`
    )
  }

  if (!response.ok) {
    throw new Error(`Registry fetch failed for "${name}": HTTP ${response.status}`)
  }

  const data = await response.json() as Record<string, unknown>
  const times = (data.time ?? {}) as Record<string, string>
  const rawVersions = (data.versions ?? {}) as Record<string, { dist?: { unpackedSize?: number } }>

  const versions: RegistryVersion[] = Object.entries(rawVersions).map(([version, meta]) => ({
    version,
    publishedAt: times[version] ?? null,
    unpackedSize: meta.dist?.unpackedSize ?? null,
  }))

  versions.sort((a, b) => {
    if (a.publishedAt && b.publishedAt) {
      return b.publishedAt.localeCompare(a.publishedAt)
    }
    if (a.publishedAt) return -1
    if (b.publishedAt) return 1
    return semver.rcompare(a.version, b.version)
  })

  cache.set(cacheKey, versions)
  return versions
}
