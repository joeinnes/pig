---
id: pig-sbrh
status: closed
deps: [pig-t6rv]
links: []
created: 2026-03-04T08:53:16Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-nftb
---
# pnpm install runner

Run 'pnpm install --frozen-lockfile=false' in a given project directory. Capture stdout/stderr. Return { success: boolean, output: string }. Include a reasonable timeout.

## Acceptance Criteria

Runs pnpm install correctly; captures stdout and stderr; returns success/failure with output; timeout after reasonable duration; does not throw on non-zero exit (returns success:false instead)

