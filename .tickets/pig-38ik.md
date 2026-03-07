---
id: pig-38ik
status: in_progress
deps: [pig-cyi9]
links: []
created: 2026-03-04T08:52:23Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-n9pn
---
# Scan path walker

Walk each configured scanPath, recursively find all pnpm-lock.yaml files, return list of DiscoveredProject { lockfilePath, projectRoot }. Always ignore **/node_modules/** and **/.git/**. Apply additional ignore globs from config. Do not follow symlinks.

## Acceptance Criteria

Finds pnpm-lock.yaml at any depth; skips node_modules and .git at any depth by default; custom ignore patterns applied; does not follow symlinks; returns empty array (not error) for non-existent scan path; all output paths are absolute

