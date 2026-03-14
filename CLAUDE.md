# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`pig` (PNPM Interactive Groomer) is a CLI tool for managing pnpm store bloat across multiple projects. It scans lockfiles globally, surfaces packages with multiple resolved versions, and provides an interactive TUI for aligning them to a single version.

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Bundle with tsup (outputs to dist/)
pnpm test             # Run tests
pnpm dev              # Build in watch mode
```

The compiled entry point is `dist/index.js`. The `pig` binary in `node_modules/.bin/pig` is linked from `package.json#bin`.

## Tech Stack

- Node.js 22+, TypeScript
- `@clack/prompts` for the interactive TUI
- tsup for bundling to a single JS file
- pnpm 9+ (required for lockfile parsing)

## Architecture

```
src/
  index.ts         # CLI entry point — parses args, dispatches to commands
  commands/
    scan.ts        # Walk scanPaths, parse pnpm-lock.yaml, build version map
    groom.ts       # Interactive session: show conflicts, prompt for resolution
    store.ts       # Show pnpm store path and size
  strategies/      # Resolution strategies (lowest, most-acceptable, latest, etc.)
  utils/           # Shared helpers (registry fetch, lockfile parsing, etc.)
test/              # Test files
docs/
  docs.html        # Full command reference (self-contained HTML)
```

## Configuration

Global config: `~/.pig/config.json`
Per-project config: `.pig.json` co-located with `pnpm-lock.yaml`

## Distribution

Published via `pnpm publish`. Homebrew tap at `joeinnes/tap`.

Use the `release` skill (`/release`) to cut a new version — it handles version bump, bundle, GitHub release, and Homebrew tap update.
