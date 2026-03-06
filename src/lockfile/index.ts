import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseV6 } from './parse-v6.ts'
import { parseV9 } from './parse-v9.ts'
import type { ParsedLockfile } from './types.ts'

export type { ParsedLockfile, ResolvedPackage } from './types.ts'

export async function parseLockfile(filePath: string): Promise<ParsedLockfile> {
  const content = await readFile(filePath, 'utf8')
  const projectRoot = dirname(filePath)

  // Peek at lockfileVersion to pick the right parser
  const versionMatch = content.match(/^lockfileVersion:\s*['"]?([^'"\n]+)['"]?/m)
  const version = versionMatch?.[1]?.trim() ?? ''

  const major = parseInt(version.split('.')[0], 10)

  if (major === 6) {
    return parseV6(content, projectRoot)
  }

  if (major === 7 || major === 8 || major === 9) {
    return parseV9(content, projectRoot)
  }

  // Unknown version — warn and attempt v9-style parse as best effort
  console.warn(`pig: unknown lockfile version "${version}" in ${filePath}, attempting best-effort parse`)
  return parseV9(content, projectRoot)
}
