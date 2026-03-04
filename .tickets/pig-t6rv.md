---
id: pig-t6rv
status: closed
deps: []
links: []
created: 2026-03-04T08:51:55Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-e3uu
---
# Initialise TypeScript project

Set up package.json with bin entry pointing to compiled CLI, tsconfig.json, build script, and src/index.ts entry point. Register all subcommands (scan, store) and global flags. Deps: @clack/prompts, js-yaml, semver, @types/semver, @types/node, typescript.

## Acceptance Criteria

pnpm build compiles without errors; pig --help lists all subcommands and global flags; pig scan --help and pig store --help show help; no runtime deps beyond the listed set

