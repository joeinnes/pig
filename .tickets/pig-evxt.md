---
id: pig-evxt
status: open
deps: [pig-b7v7]
links: []
created: 2026-03-04T08:52:56Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-5mep
---
# Strategy: align to project X

Use the resolved version from a specific named project as the alignment target. strategyAlignToProject(group, projectRoot). Returns error result if the project is not found in the group. Useful for 'match my work monorepo' scenarios.

## Acceptance Criteria

Returns the resolved version from the specified project; alignmentCost computed for all other projects; returns error if project not in group; requiresNetwork false; unit tested

