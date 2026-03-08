import { readFile, writeFile } from 'node:fs/promises'
import { rangeIncludes } from './semver-utils.ts'

export interface TransformResult {
  newRange: string
  changed: boolean
  warning?: string
}

const DEP_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

// Parse a leading operator from a semver range like ">=1.0.0", "~1.0.0", "^1.0.0"
function parseOperator(range: string): { operator: string; version: string } | null {
  const match = range.match(/^(>=|<=|>|<|~|\^|=)?(.+)$/)
  if (!match) return null
  return { operator: match[1] ?? '', version: match[2] }
}

export function transformRange(range: string, target: string): TransformResult {
  // Always leave workspace: and bare * untouched
  if (range.startsWith('workspace:') || range === '*') {
    return { newRange: range, changed: false }
  }

  const parsed = parseOperator(range)
  if (!parsed) return { newRange: range, changed: false }

  const { operator } = parsed

  if (operator === '^' || operator === '~') {
    // For tracking ranges, only update if current range doesn't cover target
    if (rangeIncludes(range, target)) return { newRange: range, changed: false }
    return { newRange: `${operator}${target}`, changed: true }
  }

  if (operator === '>=' || operator === '<=' || operator === '>' || operator === '<') {
    // Comparator ranges always update to track the target version
    const newRange = `${operator}${target}`
    if (newRange === range) return { newRange: range, changed: false }
    return { newRange, changed: true }
  }

  // Exact version (operator is '' or '=')
  const newRange = target
  if (newRange === range) return { newRange: range, changed: false }
  return {
    newRange,
    changed: true,
    warning: `"${range}" is an exact pin — updated to "${newRange}". Consider switching to a range.`,
  }
}

export async function updatePackageJsonRange(
  filePath: string,
  packageName: string,
  targetVersion: string
): Promise<{ changed: boolean; warning?: string }> {
  const raw = await readFile(filePath, 'utf8')

  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(raw)
  } catch {
    return { changed: false }
  }

  // Find the current range in any dep section
  let currentRange: string | undefined
  for (const section of DEP_SECTIONS) {
    const deps = pkg[section] as Record<string, string> | undefined
    if (deps?.[packageName]) {
      currentRange = deps[packageName]
      break
    }
  }

  if (currentRange === undefined) return { changed: false }

  const { newRange, changed, warning } = transformRange(currentRange, targetVersion)
  if (!changed) return { changed: false }

  // Replace only the specific value in the raw string, preserving all formatting.
  // Match the key and its quoted value in JSON.
  const escapedPkg = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedOld = currentRange.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`("${escapedPkg}"\\s*:\\s*)"${escapedOld}"`)
  const updated = raw.replace(pattern, `$1"${newRange}"`)

  if (updated === raw) return { changed: false }

  await writeFile(filePath, updated, 'utf8')
  return { changed: true, warning }
}
