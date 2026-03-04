import type { VersionGroupMap } from './version-group-map.ts'

export const VALID_STRATEGIES = [
  'lowest',
  'most-acceptable',
  'project',
  'latest',
  'specific',
] as const

export type StrategyName = typeof VALID_STRATEGIES[number]

interface Ok<T> { type: 'ok'; value: T }
interface Err { type: 'error'; message: string }

type Result<T> = Ok<T> | Err

// Keep the same signature shape the tests use (destructured differently below)
interface FilterOk { type: 'ok'; map: VersionGroupMap }
interface FilterErr { type: 'error'; message: string }
type FilterResult = FilterOk | FilterErr

interface StrategyOk { type: 'ok'; strategy: StrategyName | null }
interface StrategyErr { type: 'error'; message: string }
type StrategyResult = StrategyOk | StrategyErr

export function filterByPackage(
  map: VersionGroupMap,
  packageName: string | undefined
): FilterResult {
  if (!packageName) return { type: 'ok', map }

  if (!map.has(packageName)) {
    return {
      type: 'error',
      message: `Package "${packageName}" not found in the version group map. ` +
        `Known packages: ${[...map.keys()].join(', ')}`,
    }
  }

  const filtered: VersionGroupMap = new Map([[packageName, map.get(packageName)!]])
  return { type: 'ok', map: filtered }
}

export function resolveStrategy(strategyName: string | undefined): StrategyResult {
  if (!strategyName) return { type: 'ok', strategy: null }

  if ((VALID_STRATEGIES as readonly string[]).includes(strategyName)) {
    return { type: 'ok', strategy: strategyName as StrategyName }
  }

  return {
    type: 'error',
    message: `Invalid strategy "${strategyName}". Valid strategies: ${VALID_STRATEGIES.join(', ')}`,
  }
}
