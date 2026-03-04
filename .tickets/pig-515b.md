---
id: pig-515b
status: closed
deps: [pig-sbrh]
links: []
created: 2026-03-04T08:53:16Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-nftb
---
# Validation hook runner

Run the configured validation hook (shell command) in a project root. On non-zero exit, revert both package.json and pnpm-lock.yaml to their pre-change snapshots. Global hook used by default; per-project pig.config.json validate field overrides it. Snapshots are taken before any changes are made to a project.

## Acceptance Criteria

Global hook runs by default; per-project pig.config.json override works; revert restores both package.json and lockfile atomically (both or neither); clear error message shown on validation failure; --no-validate skips hook entirely; snapshot/revert is not affected by --dry-run (dry run never reaches this step)

