# pi-flow — Context

## Glossary

| Term | Definition |
|------|-----------|
| **Pipeline** | A multi-stage development workflow (e.g., new-feature, debug, improve-arch) that orchestrates skill execution in sequence. |
| **Stage** | A single step within a pipeline, mapping to a pi skill (grill, prd, issues, tdd). Each stage has a model type (design or code) and a gate. |
| **Gate** | A checkpoint at the end of a stage. `pause` gates require manual `/pi-flow:next` to advance. `auto` gates advance automatically when a completion signal is detected. |
| **Model type** | Classification of a stage as `design` (planning skills) or `code` (implementation skills), determining which LLM model the pipeline switches to. |
| **Release** | A published version of `@resolutedev/pi-flow` on the npm registry, triggered by a git tag push. |
| **Version tag** | A git tag in the format `v{major}.{minor}.{patch}` (e.g., `v1.2.0`) that serves as the source of truth for the published npm version. |

## Bounded Context

pi-flow is a single bounded context: a workflow orchestration extension for the pi coding agent. It manages pipeline state, model switching, and skill invocation sequencing.
