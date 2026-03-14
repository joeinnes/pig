---
id: pig-1ifd
status: closed
deps: [pig-t6rv]
links: []
created: 2026-03-04T08:52:38Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-5mep
---
# Registry client

HTTP client for fetching package metadata from npm registry. fetchPackageVersions(name, registryUrl): RegistryVersion[] sorted newest first. Each entry: { version, publishedAt, unpackedSize }. Use GET {registryUrl}/{name} with Accept: application/vnd.npm.install-v1+json. Cache responses in a Map per session. Use Node built-in fetch (Node 18+), no axios or node-fetch.

## Acceptance Criteria

Fetches version list correctly; sorted newest first; unpackedSize is null if absent; session cache prevents duplicate requests; network errors throw descriptive error; uses config.registryUrl; uses native fetch only

