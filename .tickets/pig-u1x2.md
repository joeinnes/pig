---
id: pig-u1x2
status: closed
deps: [pig-uu27, pig-qk1i]
links: []
created: 2026-03-04T08:53:30Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-ykpy
---
# TUI: package list view

Clack-based list of all packages with multiple resolved versions. Navigation: arrow keys or j/k to move; Enter to expand a package; s to skip (remove from queue); d to defer (re-append to end of queue); q to quit with prompt. Show package name, number of versions, and number of affected projects in the list.

## Acceptance Criteria

Navigation works with arrows and j/k; Enter expands to detail view; s removes package from session queue; d re-appends to end; q prompts user to apply or discard; package count and version count shown in list

