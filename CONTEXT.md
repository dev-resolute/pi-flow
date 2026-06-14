# pi-flow — Context

## Glossary

| Term | Definition |
|------|-----------|
| **Flow** | A user-defined, ordered sequence of skills run as one workflow, triggered by name. Flows are the user's own data; `pi-flow` ships three starter flows (`new-feature`, `improve-arch`, `debug`) the user installs once and then owns. Replaces the earlier term *Pipeline*. |
| **Stage** | A single skill within a flow, configured with its own model and a mode. "Which stage am I in" = which skill is currently running. |
| **Mode** | A per-stage setting: `HITL` (the flow halts after the skill and waits for a human command before advancing) or `AFK` (the flow auto-advances when the skill's turn ends). A flow whose stages are all `AFK` runs unattended end to end. Replaces the earlier `Gate` (`auto`/`pause`) concept. |
| **Model** | The LLM a given stage runs on. Each stage names its own model, replacing the earlier `design`/`code` binary classification. |
| **Release** | A published version of `@resolutedev/pi-flow` on the npm registry, triggered by a git tag push. |
| **Version tag** | A git tag in the format `v{major}.{minor}.{patch}` (e.g., `v1.2.0`) that serves as the source of truth for the published npm version. |

## Bounded Context

pi-flow is a single bounded context: a workflow orchestration extension for the pi coding agent. It manages flow definitions (user-authored), stage sequencing, per-stage model switching, and mode-driven advancement (HITL pauses vs AFK auto-traversal).
