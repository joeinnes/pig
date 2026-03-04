---
id: pig-dt61
status: closed
deps: [pig-b7v7]
links: []
created: 2026-03-04T08:52:56Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-5mep
---
# Strategy: align to lowest required

Return the lowest semver version currently resolved across all projects in a VersionGroup. No network calls. Safest for compatibility — never asks a project to accept a version newer than it already has.

## Acceptance Criteria

Returns lowest semver in the group; alignmentCost computed correctly via T011; no network calls; works when all projects already on same version (cost 0); unit tested with multi-project fixture

