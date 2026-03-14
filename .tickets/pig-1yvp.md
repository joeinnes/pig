---
id: pig-1yvp
status: closed
deps: [pig-fvr7]
links: []
created: 2026-03-04T08:52:23Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-n9pn
---
# Store savings estimator

Given the VersionGroupMap, estimate bytes freeable from the pnpm store if all packages were fully aligned. Run 'pnpm store path' to locate store. Walk store v3/files directory, sum sizes per version. Saving per package = total size of all versions minus the largest single version. Return { estimatedSavingsBytes, storeFound }.

## Acceptance Criteria

Runs pnpm store path to locate store (no hardcoded paths); returns non-negative byte count; storeFound: false returned gracefully if store missing or unreadable; does not modify store; handles versions with no store entry

