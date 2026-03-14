---
id: pig-qk1i
status: closed
deps: [pig-dzxu, pig-515b, pig-dt61, pig-e8l0, pig-evxt, pig-5h6r, pig-wquv]
links: []
created: 2026-03-04T08:53:16Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-nftb
---
# Change queue and apply pipeline

Orchestrate the full per-project change application: accept a list of queued changes, for each project apply T018 (package.json update) then T019 (pnpm install) then T020 (validation hook). Show live progress. Print end summary. Per-project failures do not stop other projects. In dry-run mode, show proposed changes without executing any writes.

## Acceptance Criteria

Projects processed in deterministic order; per-project failures reported clearly and do not stop remaining projects; end summary shows counts of successes/failures/reverts; dry-run shows all proposed changes without modifying any file; progress output shown per project

