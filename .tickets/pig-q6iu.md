---
id: pig-q6iu
status: in_progress
deps: [pig-uu27, pig-k7vs, pig-jhz5]
links: []
created: 2026-03-04T08:53:50Z
type: task
priority: 2
assignee: Joe Innes
parent: pig-8655
---
# Documentation site and README

Create the pig documentation site (docs/index.html) and README.md using the /frontend-design skill. Heavily inspired by the cow docs aesthetic: Playfair Display headings, JetBrains Mono body, cream/parchment palette (#f5f0e5), dark terminal blocks, sticky nav with blur backdrop. Pig-themed accent colours (warm pink/rose instead of cow green). Cover: overview, installation, pig.config / pigrc reference, all CLI commands with examples, alignment strategy explanations. README should be concise and link to the docs site.

## Design

Inspired by personal/cow/docs/docs.html. Same typographic system (Playfair Display + JetBrains Mono) and layout patterns, but pig-themed: swap the green accent for a warm rose/pink, replace the Holstein cow-patch SVG background with a subtle pig-snout or trotter motif at low opacity. Keep the dark terminal blocks, cream card backgrounds, and sticky frosted-glass nav.

## Acceptance Criteria

docs/index.html renders correctly in browser; covers all CLI commands with code examples; pigrc fields documented; README.md present with install instructions and link to docs; no broken links; consistent with cow docs visual language

