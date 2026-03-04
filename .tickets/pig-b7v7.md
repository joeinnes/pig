---
id: pig-b7v7
status: closed
deps: [pig-t6rv]
links: []
created: 2026-03-04T08:52:38Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-5mep
---
# Semver range satisfaction checker

Utility wrapping the semver package. rangeIncludes(range, version): boolean — does this package.json range include this version? Handle ^, ~, exact, >=, *, workspace:* and workspace:^ (always true). Also implement alignmentCost(group, candidateVersion): number — count of projects whose declaredRange does not include the candidate (null range counts as cost 1).

## Acceptance Criteria

rangeIncludes correct for ^, ~, exact, >=, *; workspace:* and workspace:^ return true; null range treated as not satisfied in alignmentCost; alignmentCost returns correct count; unit tested with representative inputs

