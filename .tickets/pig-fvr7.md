---
id: pig-fvr7
status: closed
deps: [pig-smmx, pig-omgq]
links: []
created: 2026-03-04T08:52:09Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-kcu8
---
# Version group map builder

Consume ParsedLockfile results from multiple projects and build a VersionGroupMap: map from package name to all resolved versions found across projects, with which projects use each version and their package.json declared range. declaredRange must be read from package.json (dependencies/devDependencies/optionalDependencies), not the lockfile. Only include packages with 2+ distinct resolved versions.

## Acceptance Criteria

Groups correctly by package name across multiple lockfiles; declaredRange read from package.json not lockfile; missing package.json handled gracefully (null); only packages with 2+ distinct versions included; scoped packages keyed correctly; same project appearing twice is deduplicated

