---
id: pig-g2zo
status: closed
deps: [pig-u1x2, pig-vehx, pig-y09t]
links: []
created: 2026-03-04T08:53:50Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-o1si
---
# Focused session flags

Implement --package <name> and --strategy <name> flags. --package filters the interactive session and scan to a single named package. --strategy applies the named strategy to all packages without showing the interactive strategy selector (valid values: lowest, most-acceptable, project, latest, specific). Both flags work together and with --dry-run.

## Acceptance Criteria

--package correctly filters TUI and change queue to the named package; unknown package name exits with clear error; --strategy skips TUI strategy selection and applies directly; invalid strategy name exits with clear error listing valid values; both flags compose with --dry-run

