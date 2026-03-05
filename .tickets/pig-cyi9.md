---
id: pig-cyi9
status: in_progress
deps: [pig-t6rv]
links: []
created: 2026-03-04T08:51:55Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-7i44
---
# Config loading

Load ~/.pigrc (JSON or YAML) and per-project pig.config.json. Supported fields: scanPaths, ignore, validate, registryUrl. Per-project pig.config.json only supports validate. Expand ~ in paths. Defaults: ignore=[**/node_modules/**], registryUrl=https://registry.npmjs.org.

## Acceptance Criteria

~/.pigrc in JSON and YAML both parse; missing config uses defaults; invalid config exits with clear error including file path; per-project validate override works; ~ expanded in all path values


## Notes

**2026-03-04T09:12:54Z**

Convention changed from ~/.pigrc/pig.config.json to ~/.pig/config.json/.pig.json to match cow conventions (~/.cow/state.json, .cow.json). YAML support dropped (JSON only). js-yaml removed from runtime dependencies. Acceptance criteria updated accordingly.
