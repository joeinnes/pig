---
id: pig-k7vs
status: open
deps: [pig-t6rv]
links: []
created: 2026-03-04T08:52:38Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-mc6v
---
# pig store command

Implement pig store subcommand. Locate store via 'pnpm store path', walk store directory to compute total size and per-package size. Show: total store size, top 10 packages by footprint with version count and per-version breakdown. No lockfile scanning required.

## Acceptance Criteria

Locates store via pnpm store path (not hardcoded); total size accurate; top 10 packages listed sorted by total size descending; per-version size breakdown shown; all sizes human-readable; no files modified; exits cleanly if pnpm not installed or store not found

