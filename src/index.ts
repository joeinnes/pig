import { loadGlobalConfig } from './config.ts'
import { buildSessionConfig } from './session-config.ts'
import { runScan } from './scan.ts'
import { runStore } from './store-command.ts'

const args = process.argv.slice(2)
const subcommand = args.find(a => !a.startsWith('-'))

function showRootHelp(): void {
  console.log(`pig — PNPM Interactive Groomer

Usage:
  pig                        Launch interactive grooming session
  pig scan                   Scan projects and report, no changes
  pig store                  Show pnpm store summary

Options:
  --dry-run                  Preview changes without applying them
  --package <name>           Focus session on a single package
  --strategy <name>          Apply named strategy without prompting
  --validate <cmd>           Override validation hook for this session
  --no-validate              Skip all validation hooks
  --paths <a,b,...>          Override configured scan paths
  --help                     Show help
  --version                  Show version`)
}

function showScanHelp(): void {
  console.log(`pig scan — Scan projects and report version conflicts

Usage:
  pig scan [options]

Options:
  --paths <a,b,...>          Override configured scan paths
  --dry-run                  Show what would change
  --help                     Show help`)
}

function showStoreHelp(): void {
  console.log(`pig store — Show pnpm store summary

Usage:
  pig store [--help]

Options:
  --help                     Show help`)
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('0.1.1')
  process.exit(0)
}

if (args.includes('--help') || args.includes('-h') || args[0] === 'help') {
  if (subcommand === 'scan') { showScanHelp(); process.exit(0) }
  if (subcommand === 'store') { showStoreHelp(); process.exit(0) }
  showRootHelp()
  process.exit(0)
}

switch (subcommand) {
  case undefined:
    showRootHelp()
    process.exit(0)
    break
  case 'scan': {
    const base = loadGlobalConfig()
    const scanArgs = args.filter(a => a !== 'scan')
    const config = buildSessionConfig(scanArgs, base)
    if (config.scanPaths.length === 0) {
      console.error('pig scan: no scan paths configured.\nAdd scanPaths to ~/.pig/config.json or pass --paths <a,b,...>')
      process.exit(1)
    }
    await runScan(config)
    process.exit(0)
    break
  }
  case 'store':
    await runStore()
    process.exit(0)
    break
  default:
    console.error(`pig: unknown command "${subcommand}"`)
    showRootHelp()
    process.exit(1)
}
