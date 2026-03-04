---
id: pig-y09t
status: open
deps: [pig-cyi9]
links: []
created: 2026-03-04T08:51:55Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-7i44
---
# CLI flag overrides

Implement all global CLI flags that override config for the session: --paths, --validate, --no-validate, --strategy, --package, --dry-run. Produce a resolved SessionConfig object (merging config + flags) used throughout the codebase.

## Acceptance Criteria

Each flag correctly overrides its config value; --no-validate disables all hooks; --paths splits on comma and expands ~; unknown flags exit with clear error; SessionConfig type exported and used consistently

