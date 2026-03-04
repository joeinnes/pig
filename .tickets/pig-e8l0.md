---
id: pig-e8l0
status: closed
deps: [pig-b7v7, pig-fvr7]
links: []
created: 2026-03-04T08:52:56Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-5mep
---
# Strategy: align to most acceptable

Find the highest version satisfying the most existing package.json ranges across all projects. Algorithm: for each currently-resolved version as candidate, count how many projects' declaredRange includes it. Pick highest count; break ties by highest semver. If tie cannot be broken (different candidates satisfy different project sets equally), return a TieResult with the tied candidates. Include freeCount and alignmentCost in result.

## Acceptance Criteria

Picks highest version satisfying most ranges; semver-highest wins ties where candidates cover the same projects; returns type:'tie' when candidates satisfy distinct project sets equally; freeCount and alignmentCost correct; no network calls; unit tested for single winner, semver tie-break, and genuine tie

