import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface PigConfig {
  scanPaths: string[]
  ignore: string[]
  validate?: string
  registryUrl: string
}

export interface ProjectConfig {
  validate?: string
}

const DEFAULTS: PigConfig = {
  scanPaths: [],
  ignore: ['**/node_modules/**'],
  registryUrl: 'https://registry.npmjs.org',
}

function expandHome(p: string): string {
  return p.startsWith('~/') ? join(homedir(), p.slice(2)) : p
}

export function defaultConfigPath(): string {
  return join(homedir(), '.pig', 'config.json')
}

export function loadGlobalConfig(configPath?: string): PigConfig {
  const path = configPath ?? defaultConfigPath()

  if (!existsSync(path)) {
    return { ...DEFAULTS }
  }

  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (err) {
    throw new Error(`pig: failed to read config at ${path}: ${err}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`pig: invalid config at ${path}: ${err}`)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`pig: invalid config at ${path}: expected a JSON object`)
  }

  const cfg = parsed as Record<string, unknown>

  return {
    scanPaths: Array.isArray(cfg.scanPaths)
      ? cfg.scanPaths.map(String).map(expandHome)
      : [],
    ignore: Array.isArray(cfg.ignore)
      ? cfg.ignore.map(String).map(expandHome)
      : ['**/node_modules/**'],
    validate: typeof cfg.validate === 'string' ? cfg.validate : undefined,
    registryUrl:
      typeof cfg.registryUrl === 'string'
        ? cfg.registryUrl
        : 'https://registry.npmjs.org',
  }
}

export function loadProjectConfig(projectRoot: string): ProjectConfig {
  const configPath = join(projectRoot, '.pig.json')

  if (!existsSync(configPath)) {
    return {}
  }

  let raw: string
  try {
    raw = readFileSync(configPath, 'utf8')
  } catch {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    return {
      validate: typeof parsed?.validate === 'string' ? parsed.validate : undefined,
    }
  } catch {
    return {}
  }
}
