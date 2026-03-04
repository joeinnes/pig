---
id: pig-uu27
status: closed
deps: [pig-38ik, pig-fvr7, pig-1yvp]
links: []
created: 2026-03-04T08:52:23Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-n9pn
---
# pig scan command

Implement the pig scan subcommand. Orchestrates: walk scan paths (T007), parse all lockfiles (T005), build version group map (T006), estimate savings (T008), print summary. Output: 'Found N projects across N scan paths / N packages have multiple resolved versions / Estimated potential savings: ~X MB'. If no scan paths configured and --paths not given, exit with helpful message.

## Acceptance Criteria

Prints three-line summary in correct format; sizes human-readable (KB/MB/GB); --paths flag overrides scan paths; exits with clear message if no scan paths configured; exits 0 on success; no files modified

