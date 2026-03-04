import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchPackageVersions, clearRegistryCache } from '../src/registry.ts'

// Build a mock fetch response
function mockResponse(body: unknown, ok = true, status = 200): typeof fetch {
  return (async (_url: unknown, _init?: unknown) => ({
    ok,
    status,
    json: async () => body,
  })) as unknown as typeof fetch
}

const REGISTRY = 'https://registry.npmjs.org'

const SAMPLE_BODY = {
  versions: {
    '1.0.0': { dist: { unpackedSize: 1000 } },
    '2.0.0': { dist: { unpackedSize: 2000 } },
    '1.5.0': { dist: {} }, // unpackedSize absent
  },
  time: {
    '1.0.0': '2020-01-01T00:00:00.000Z',
    '2.0.0': '2022-01-01T00:00:00.000Z',
    '1.5.0': '2021-01-01T00:00:00.000Z',
  },
}

test('returns versions sorted newest first by publishedAt', async () => {
  clearRegistryCache()
  const versions = await fetchPackageVersions('lodash', REGISTRY, {
    fetcher: mockResponse(SAMPLE_BODY),
  })
  assert.equal(versions[0].version, '2.0.0')
  assert.equal(versions[1].version, '1.5.0')
  assert.equal(versions[2].version, '1.0.0')
})

test('unpackedSize is null when absent from dist', async () => {
  clearRegistryCache()
  const versions = await fetchPackageVersions('lodash', REGISTRY, {
    fetcher: mockResponse(SAMPLE_BODY),
  })
  const v150 = versions.find(v => v.version === '1.5.0')!
  assert.equal(v150.unpackedSize, null)
})

test('unpackedSize is set when present in dist', async () => {
  clearRegistryCache()
  const versions = await fetchPackageVersions('lodash', REGISTRY, {
    fetcher: mockResponse(SAMPLE_BODY),
  })
  const v200 = versions.find(v => v.version === '2.0.0')!
  assert.equal(v200.unpackedSize, 2000)
})

test('publishedAt is correct ISO string', async () => {
  clearRegistryCache()
  const versions = await fetchPackageVersions('lodash', REGISTRY, {
    fetcher: mockResponse(SAMPLE_BODY),
  })
  const v100 = versions.find(v => v.version === '1.0.0')!
  assert.equal(v100.publishedAt, '2020-01-01T00:00:00.000Z')
})

test('publishedAt is null when time entry absent', async () => {
  clearRegistryCache()
  const body = {
    versions: { '1.0.0': { dist: {} } },
    time: {},
  }
  const versions = await fetchPackageVersions('no-time', REGISTRY, {
    fetcher: mockResponse(body),
  })
  assert.equal(versions[0].publishedAt, null)
})

test('session cache prevents duplicate fetch calls', async () => {
  clearRegistryCache()
  let calls = 0
  const fetcher = (async () => {
    calls++
    return { ok: true, status: 200, json: async () => SAMPLE_BODY }
  }) as unknown as typeof fetch

  await fetchPackageVersions('cached-pkg', REGISTRY, { fetcher })
  await fetchPackageVersions('cached-pkg', REGISTRY, { fetcher })
  assert.equal(calls, 1, 'expected fetcher called only once')
})

test('different packages are cached independently', async () => {
  clearRegistryCache()
  let calls = 0
  const fetcher = (async () => {
    calls++
    return { ok: true, status: 200, json: async () => ({ versions: {}, time: {} }) }
  }) as unknown as typeof fetch

  await fetchPackageVersions('pkg-a', REGISTRY, { fetcher })
  await fetchPackageVersions('pkg-b', REGISTRY, { fetcher })
  assert.equal(calls, 2)
})

test('throws descriptive error on non-ok HTTP response', async () => {
  clearRegistryCache()
  await assert.rejects(
    fetchPackageVersions('bad-pkg', REGISTRY, {
      fetcher: mockResponse({}, false, 404),
    }),
    /404/
  )
})

test('throws descriptive error on network failure', async () => {
  clearRegistryCache()
  const brokenFetch = (async () => {
    throw new Error('ECONNREFUSED')
  }) as unknown as typeof fetch

  await assert.rejects(
    fetchPackageVersions('fail-pkg', REGISTRY, { fetcher: brokenFetch }),
    /ECONNREFUSED/
  )
})

test('uses registryUrl as base for request URL', async () => {
  clearRegistryCache()
  let capturedUrl = ''
  const fetcher = (async (url: unknown) => {
    capturedUrl = String(url)
    return { ok: true, status: 200, json: async () => ({ versions: {}, time: {} }) }
  }) as unknown as typeof fetch

  const customRegistry = 'https://my.registry.example.com'
  await fetchPackageVersions('my-pkg', customRegistry, { fetcher })
  assert.ok(capturedUrl.startsWith(customRegistry), `URL should start with registry: ${capturedUrl}`)
})
