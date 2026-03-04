---
id: pig-dzxu
status: closed
deps: [pig-t6rv]
links: []
created: 2026-03-04T08:53:16Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-nftb
---
# package.json range updater

Update a dependency range in package.json preserving specifier style. Rules: ^ -> ^<target>, ~ -> ~<target>, exact -> <target> + warning, comparators (>= etc) -> update version preserve operator, workspace:* / workspace:^ -> leave untouched, * -> leave untouched. Preserve all other fields, formatting, key order, and trailing newline. Return { changed, warning? }. Return changed:false if range already covers target.

## Acceptance Criteria

^ and ~ ranges updated correctly; exact pins updated with warning; workspace: ranges untouched; * untouched; no other fields or formatting altered; changed:false when range already covers target; idempotent; unit tested with representative package.json fixtures

