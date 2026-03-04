---
id: pig-omgq
status: open
deps: [pig-t6rv]
links: []
created: 2026-03-04T08:52:09Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-kcu8
---
# Parse pnpm-lock.yaml v9+

Parse lockfile v9 (lockfileVersion: '9.0'). Resolved packages are under snapshots: not packages:. Expose a single parseLockfile(filePath) function that auto-detects version and delegates to v6 or v9 parser. Return the same ParsedLockfile shape as T004.

## Acceptance Criteria

Correctly parses a real-world v9 lockfile; parseLockfile auto-detects v6 vs v9; output shape identical to v6 parser; unknown lockfile version logs warning and attempts best-effort parse; handles scoped packages and peer dep suffixes

