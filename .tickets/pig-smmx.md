---
id: pig-smmx
status: open
deps: [pig-t6rv]
links: []
created: 2026-03-04T08:52:09Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-kcu8
---
# Parse pnpm-lock.yaml v6

Parse lockfile v6 (lockfileVersion: '6.0'). Resolved packages are under the packages: key. Keys look like /lodash@4.17.21: or /@scope/pkg@1.0.0(peer@1.0.0):. Extract package name and resolved version. Return ParsedLockfile { lockfileVersion, projectRoot, packages: ResolvedPackage[] }.

## Acceptance Criteria

Correctly parses a real-world v6 lockfile; handles scoped packages; strips peer dep suffixes from keys; ignores non-package entries (settings:, importers:); returns empty array for lockfile with no packages; does not throw on unknown fields

