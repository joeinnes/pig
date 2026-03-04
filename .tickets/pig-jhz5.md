---
id: pig-jhz5
status: closed
deps: [pig-vehx]
links: []
created: 2026-03-04T08:53:30Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-ykpy
---
# TUI: deferred queue and session end

After all initially-listed packages are processed (skipped, strategised, or deferred), replay the deferred queue. After the deferred queue is also exhausted, prompt: apply all queued changes or discard. Quitting mid-deferred-queue also shows this prompt.

## Acceptance Criteria

Deferred packages appear after initial queue is exhausted; quit from within deferred queue also shows apply/discard prompt; apply triggers T021 pipeline; discard exits without any file changes; empty queue (all skipped) exits cleanly

