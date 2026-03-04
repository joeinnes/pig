---
id: pig-wquv
status: open
deps: [pig-b7v7, pig-1ifd]
links: []
created: 2026-03-04T08:52:56Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-5mep
---
# Strategy: select specific version

Fetch all versions from registry, present in a @clack/prompts searchable picker. Each entry shows version, publish date (human-relative, e.g. '2 years ago'), and unpacked size if available. Versions sorted newest first. Cancellation returns null (no strategy applied).

## Acceptance Criteria

Fetches all versions from registry; newest-first with date and size; filtering/search works; cancellation returns null without error; alignmentCost computed for selected version; requiresNetwork true

