---
id: pig-5h6r
status: open
deps: [pig-b7v7, pig-1ifd]
links: []
created: 2026-03-04T08:52:56Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-5mep
---
# Strategy: upgrade to latest

Fetch the version tagged 'latest' on the registry (dist-tags.latest, not necessarily highest semver) and use as alignment target. Compute alignmentCost — any project whose declaredRange does not include the latest version needs a package.json range bump.

## Acceptance Criteria

Fetches dist-tags.latest (not just highest semver); alignmentCost computed correctly; network errors surface as user-friendly message; uses T012 session cache; requiresNetwork true in result

