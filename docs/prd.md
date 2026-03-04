# pig — PNPM Interactive Groomer

## Product Requirements Document

---

## Overview

`pig` is a CLI tool for managing pnpm store bloat across multiple unrelated projects on a single machine. It scans for lockfiles globally, surfaces packages that exist in multiple resolved versions across projects, and provides an interactive interface for aligning those versions — reducing the number of unique package versions stored on disk.

It is companion tooling to `cow` (copy-on-write sparse worktree manager), sharing the same audience: developers on disk-constrained machines.

---

## Problem

pnpm's content-addressable store deduplicates at the file level within a version — if two projects use `lodash@4.17.21`, those files are stored once. However, if one project resolves `lodash@4.16.5` and another resolves `lodash@4.17.21`, both full copies exist in the store.

This happens legitimately: each project's `package.json` version ranges are correct, pnpm resolves them independently, and there is no cross-project awareness. Over time, a developer accumulates many such split versions, none of which are wrong in isolation.

`pig` solves this by introducing cross-project awareness and giving the developer the tools to intentionally converge versions where safe to do so.

---

## Users

- Individual developers with many projects across personal and work contexts on a single machine
- Developers on disk-constrained machines (small SSDs, shared environments)
- pnpm monorepo users who also have standalone projects

---

## Non-goals

- Not a replacement for `pnpm dedupe` (intra-repo lockfile deduplication — a distinct problem)
- Not a package manager or lockfile generator itself
- Not a global `node_modules` manager
- Not multi-machine / team-oriented
- No GUI; CLI and interactive TUI only

---

## Core Concepts

### Scan paths

A configurable list of root directories to search for `pnpm-lock.yaml` files. Supports ignore patterns (e.g. skip `node_modules`, skip specific paths). Configurable in `~/.pigrc` or `pig.config.json`.

### Version groups

All resolved versions of a given package found across scanned lockfiles, grouped by package name. Each entry includes:

- Package name
- Resolved version
- Which projects use that version
- Whether the `package.json` range in each project would accept other candidate versions

### Candidate version

A version that `pig` proposes as a target for alignment. May be an existing resolved version already in the store (zero net download cost), or a new version from the registry.

### Alignment cost

For a given candidate version and package, the number of projects whose `package.json` range does not include that version — i.e. projects that would require a `package.json` range bump, not just a lockfile re-resolution.

### Validation hook

An optional shell command run per-project after changes are applied. If it exits non-zero, changes to that project are reverted.

---

## Features

### 1. Scan

```
pig scan
```

Walks configured paths, finds all `pnpm-lock.yaml` files, parses resolved versions, and builds an in-memory version group map. Outputs a summary:

```
Found 14 projects across 3 scan paths
83 packages have multiple resolved versions
Estimated potential savings: ~240 MB
```

Savings estimate is calculated by summing the sizes of all store entries that could be eliminated — i.e. all but one version of each package, if fully aligned. This is an upper bound; actual savings depend on decisions made.

### 2. Interactive grooming session

```
pig
```

Launches the interactive TUI. Presents packages with multiple resolved versions one at a time (or as a list, navigable). For each package:

- Shows all resolved versions and which projects use each
- Shows alignment cost for each candidate version
- Offers alignment strategy options (see below)
- Allows skipping or deferring

Navigation:

- Arrow keys / j/k to move between packages
- Enter to expand a package and select a strategy
- s to skip
- d to defer (return to at end of session)
- q to quit (pending changes applied or discarded based on prompt)

### 3. Alignment strategies

Per package, the user can choose from:

**Align to lowest required**
Picks the lowest version currently resolved across all projects. Safest for compatibility; may leave known bugs/vulns unfixed. Best when a work project pins a lower version that cannot change.

**Align to most acceptable**
Finds the highest version that satisfies the maximum number of existing `package.json` ranges — the "free" alignment where no `package.json` edits are needed. Where there is a tie (two versions each satisfy a different 8/10 projects), surfaces the tie and asks the user to choose.
Shows: "4.17.21 is free for 8/10 projects; 2 projects need a range bump."

**Align to project X**
Select a specific project; all other projects align to whatever version that project currently resolves. Useful for "match my work monorepo" scenarios.

**Upgrade to latest**
Fetches the latest version from the npm registry and targets that. Requires network. Any projects whose ranges don't cover it get a `package.json` range bump.

**Select specific version**
Free text / searchable version picker. Shows all versions available on the registry with date and size. Escape hatch for any scenario not covered above.

**Skip**
Take no action on this package for this session.

### 4. Applying changes

After a strategy is selected for a package, `pig` queues the following per affected project:

1. Update `package.json` version range if needed (using the most permissive range that covers the target — e.g. `^4.17.21` if bumping from `^4.16.4`)
1. Run `pnpm install --frozen-lockfile=false` to re-resolve the lockfile
1. If a validation hook is configured, run it
1. On hook failure: revert `package.json` and lockfile changes for that project, report failure

Changes are applied project by project with progress output. A summary is shown at the end.

### 5. Dry run mode

```
pig --dry-run
```

Shows all proposed changes without applying them. Useful for review before committing to a session.

### 6. Validation hook

Configured globally in `~/.pigrc` or per-project in a `pig.config.json` co-located with the project's `package.json`:

```json
{
  "validate": "pnpm test"
}
```

The hook receives the project root as the working directory. On non-zero exit, changes to that project are reverted. A global hook can be overridden per-project.

### 7. Store summary

```
pig store
```

Non-interactive. Shows current store size, top packages by store footprint, and how many versions of each are stored. No changes made. Good for a quick health check.

### 8. Config

`~/.pigrc` (JSON or YAML):

```json
{
  "scanPaths": ["~/projects", "~/work"],
  "ignore": ["**/archived/**", "~/work/legacy"],
  "validate": "pnpm test",
  "registryUrl": "https://registry.npmjs.org"
}
```

---

## CLI reference

```
pig                        Interactive grooming session
pig scan                   Scan and report, no changes
pig store                  Store summary
pig --dry-run              Preview changes only
pig --package <name>       Focus session on a single package
pig --strategy <name>      Skip strategy selection, apply named strategy to all
pig --validate "<cmd>"     Override validation hook for this session
pig --no-validate          Skip validation hooks
pig --paths <a,b>          Override scan paths for this session
```

---

## Technical notes

### Lockfile parsing

Parse `pnpm-lock.yaml` directly. The relevant fields are under `packages:` (lockfile v6) or `snapshots:` (lockfile v9+). Handle both formats.

### Store interaction

Use `pnpm store path` to locate the store. Use `pnpm store status` to verify integrity after changes. Do not manipulate store contents directly — let pnpm manage the store via `pnpm install`.

### Package.json range updates

When bumping a range, use the least restrictive range that includes the target version and is consistent with the existing range specifier style:

- If existing range is `^x.y.z`, write `^<target>`
- If existing range is `~x.y.z`, write `~<target>`
- If existing range is exact (`x.y.z`), write exact target and warn the user

### Savings estimation

Store entry sizes can be approximated by reading the store directory. Each package version's store entry is at `<store>/v3/files/...` — sum the file sizes for all versions that would be eliminated.

### Registry calls

Only made for "upgrade to latest" and "select specific version" strategies. Use the configured registry URL. Cache responses for the session duration.

---

## Implementation language

TypeScript, distributed as a standalone CLI via npm (`npm i -g pig` or `pnpm add -g pig`). Use Node.js built-ins where possible; minimise dependencies. Consider [clack](https://github.com/bombshell-dev/clack) for the interactive TUI prompts.

---

## Out of scope for v1

- yarn / npm lockfile support (pnpm only)
- Automatic PR creation
- CI mode / GitHub Actions integration
- Peer dependency awareness in alignment decisions
- Undo/history beyond per-session revert on validation failure
