---
id: pig-629w
status: open
deps: [pig-qk1i]
links: []
created: 2026-03-04T08:53:50Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-o1si
---
# Dry run mode

Implement --dry-run flag. When active, T018/T019/T020 are all skipped. The change queue (T021) still builds and shows proposed changes but does not execute them. Output must clearly indicate it is a dry run. Works in both interactive (pig) and non-interactive (pig scan) modes.

## Acceptance Criteria

No files modified when --dry-run is active; output clearly labelled as dry run; proposed changes shown per project with package name, current version, target version, and whether a range bump is needed; works from both pig and pig scan entry points

