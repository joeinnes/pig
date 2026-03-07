import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export interface DiscoveredProject {
  lockfilePath: string
  projectRoot: string
}

// Always-ignored directory names regardless of config
const DEFAULT_IGNORE_SEGMENTS = new Set(['.git', 'node_modules'])

// Extract the directory segment from a pattern like "**\/segment\/**" or "**\/segment".
// Returns null for patterns that don't fit this shape (e.g. absolute paths).
function extractSegment(pattern: string): string | null {
  if (pattern.startsWith('**/')) {
    const rest = pattern.slice(3)
    if (rest.endsWith('/**')) return rest.slice(0, -3)
    if (!rest.includes('/')) return rest
  }
  return null
}

async function walk(
  dir: string,
  ignoreSegments: Set<string>,
  absoluteIgnores: string[]
): Promise<DiscoveredProject[]> {
  const results: DiscoveredProject[] = []

  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    // Never follow symlinks
    if (entry.isSymbolicLink()) continue

    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      if (ignoreSegments.has(entry.name)) continue
      if (absoluteIgnores.some(p => fullPath.startsWith(p))) continue
      const sub = await walk(fullPath, ignoreSegments, absoluteIgnores)
      results.push(...sub)
    } else if (entry.name === 'pnpm-lock.yaml') {
      results.push({ lockfilePath: fullPath, projectRoot: dir })
    }
  }

  return results
}

export async function walkScanPaths(
  scanPaths: string[],
  ignorePatterns: string[] = []
): Promise<DiscoveredProject[]> {
  const ignoreSegments = new Set(DEFAULT_IGNORE_SEGMENTS)
  const absoluteIgnores: string[] = []

  for (const pattern of ignorePatterns) {
    const seg = extractSegment(pattern)
    if (seg) {
      ignoreSegments.add(seg)
    } else if (!pattern.includes('*')) {
      // Treat as an absolute path prefix (~ already expanded by config loader)
      absoluteIgnores.push(resolve(pattern))
    }
  }

  const allResults: DiscoveredProject[] = []
  for (const scanPath of scanPaths) {
    const abs = resolve(scanPath)
    const found = await walk(abs, ignoreSegments, absoluteIgnores)
    allResults.push(...found)
  }

  return allResults
}
