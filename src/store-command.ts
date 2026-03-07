import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { formatBytes } from './format-bytes.ts'

export interface StoreCommandOptions {
  write?: (line: string) => void
}

function getStorePath(): string | null {
  try {
    return execSync('pnpm store path', { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function walkSize(dir: string): { bytes: number; files: number } {
  let bytes = 0
  let files = 0
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return { bytes, files }
  }
  for (const name of entries) {
    const fullPath = join(dir, name)
    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      const sub = walkSize(fullPath)
      bytes += sub.bytes
      files += sub.files
    } else {
      bytes += stat.size
      files++
    }
  }
  return { bytes, files }
}

export async function runStore(
  storePath?: string,
  options: StoreCommandOptions = {}
): Promise<void> {
  const write = options.write ?? ((s: string) => console.log(s))

  const resolved = storePath ?? getStorePath()

  if (!resolved || !existsSync(resolved)) {
    write('pnpm store: not found or unavailable')
    write('Install pnpm and run `pnpm store path` to verify your store location.')
    return
  }

  const filesDir = join(resolved, 'files')
  if (!existsSync(filesDir)) {
    write('pnpm store: not found or unavailable')
    write(`Path: ${resolved}`)
    write('The store files/ directory was not found — the store may be empty or use an unsupported format.')
    return
  }

  const { bytes, files } = walkSize(filesDir)

  write(`Store path: ${resolved}`)
  write(`Total size: ${formatBytes(bytes)}`)
  write(`Cached files: ${files} file${files === 1 ? '' : 's'}`)
  write('')
  write('Note: the pnpm v10 store uses content-addressable storage.')
  write('Per-package breakdown is not available without pnpm internal metadata.')
}
