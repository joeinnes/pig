---
id: pig-vehx
status: closed
deps: [pig-u1x2, pig-dt61, pig-e8l0, pig-evxt, pig-5h6r, pig-wquv]
links: []
created: 2026-03-04T08:53:30Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-ykpy
---
# TUI: package detail and strategy selection

Detail view for a single package. Shows: all resolved versions, which projects use each version, and alignment cost for each candidate version. Presents strategy choices via @clack/prompts: lowest required, most acceptable, align to project X, upgrade to latest, select specific version, skip. Selecting 'align to project X' shows a secondary project picker. Tie result from T014 surfaces an additional prompt.

## Acceptance Criteria

All 5 strategies plus skip accessible; alignment cost shown per candidate; selecting 'align to project X' shows project picker; tie from most-acceptable strategy shows tie-break prompt; strategy selection queues change in T021; back navigation returns to package list

