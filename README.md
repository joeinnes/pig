# pig

**PNPM Interactive Groomer** — finds packages installed at multiple versions across your pnpm projects and helps you align them.

## The problem

In a large pnpm workspace (or a collection of separate pnpm repos) the same package ends up pinned at different versions in different projects. Running `pnpm install` in isolation keeps each project self-consistent, but across the board you get `react@17`, `react@18`, and `react@19` all coexisting, duplicating store space and making cross-project imports unpredictable.

pig surfaces these conflicts and resolves them.

## Install

```sh
npm install -g pig-groomer
# or
pnpm add -g pig-groomer
```

## Quick start

```sh
# 1. Tell pig where your projects live
mkdir -p ~/.pig
echo '{ "scanPaths": ["~/WebDev"] }' > ~/.pig/config.json

# 2. Scan for conflicts (read-only)
pig scan

# 3. Resolve them interactively
pig
```

## Commands

| Command | What it does |
|---------|-------------|
| `pig` | Interactive grooming session |
| `pig scan` | Report conflicts, no changes |
| `pig store` | Show pnpm store size and path |

## Strategies

When resolving a conflict, pig offers five strategies:

| Strategy | How it works |
|----------|-------------|
| `lowest` | Pin the lowest version currently in use |
| `most-acceptable` | Pick the version already acceptable to the most projects |
| `project` | Use the version from a specific project you choose |
| `latest` | Fetch `dist-tags.latest` from the npm registry |
| `specific` | Browse all published versions and pick one |

## Key flags

```
--package <name>      Focus on one package only
--strategy <name>     Apply a strategy without prompting
--dry-run             Print proposed changes, write nothing
--validate <cmd>      Override the validation hook for this session
--no-validate         Skip validation hooks
--paths <a,b,...>     Override configured scan paths
```

## Configuration

`~/.pig/config.json` — global settings:

```json
{
  "scanPaths": ["~/WebDev/work", "~/WebDev/personal"],
  "ignore": ["**/node_modules/**", "**/dist/**"],
  "validate": "pnpm run typecheck",
  "registryUrl": "https://registry.npmjs.org"
}
```

`.pig.json` — per-project override (place next to `pnpm-lock.yaml`):

```json
{
  "validate": "pnpm run build --dry-run"
}
```

## How it works

1. pig walks each `scanPath` looking for `pnpm-lock.yaml` files
2. It parses each lockfile to build a version group map: package name → versions in use → projects using each
3. For each conflict you choose a resolution strategy
4. Approved changes are queued; at the end pig confirms before writing anything
5. For each changed project pig runs `pnpm install`, then your validation hook (if configured); on failure it reverts that project atomically

## Documentation

Full command reference: [docs/docs.html](docs/docs.html)

## Requirements

- Node.js 22+
- pnpm 9+

## Licence

MIT
