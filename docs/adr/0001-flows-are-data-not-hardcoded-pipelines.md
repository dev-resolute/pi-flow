# Flows are user-owned data in a dedicated file, not hardcoded pipelines

pi-flow originally hardcoded three pipelines in `pipelines.ts`, each a fixed sequence with a `design`/`code` model binary, per-stage prompt strings, and per-skill text `completionSignals` — adding or changing a flow meant editing TypeScript and republishing. We decided a flow is the user's own data: an ordered list of `{ skill, model?, mode? }` stages, read from a single dedicated file at `~/.pi/agent/pi-flow.json` (the `flows` key). The three original flows are **seed content** that `/pi-flow:setup` materializes into that file on request; they are not merged in at runtime. One generic engine runs any flow — it switches the stage's model, sends a generic skill kickoff, and advances on pi's `agent_end` event. A stage's `mode` is the single axis controlling advancement: `AFK` auto-advances on `agent_end` (guarded by a generic anti-signal check), `HITL` halts for `/pi-flow:next` — so an all-`AFK` flow traverses unattended end to end.

## Considered Options

- **Single source: a dedicated `pi-flow.json` the user owns** — chosen. Every flow lives in one file with one texture; `/pi-flow:setup` seeds the built-ins into it on demand, after which the file is the user's (never auto-rewritten). No squatting in `settings.json`, no defaults-vs-overrides split to reason about. Trade: a seeded built-in is a frozen copy — a future package improvement to it won't reach an existing file.
- **Built-in flows as code defaults overlaid by user config** — considered and rejected. It keeps built-ins auto-updating, but it splits one concept across two textures (shipped code defaults vs user file) and leaves built-ins invisible in the user's own file, which was the recurring point of confusion.
- **Generalized code presets** — rejected: still needs a code change and republish per flow; contradicts "users trigger flows based on their need."
- **Two-axis mode (autonomy + a separate review gate)** — rejected: the orchestrator only ever decides "wait for a human or roll on," so one `HITL`/`AFK` axis suffices; "review before the next stage" is just a `HITL` stage.
- **Per-skill completion signals** — rejected for v1: `agent_end` plus a generic anti-signal guard works for arbitrary user skills with zero per-skill config.

## Consequences

- The `pi-flow.json` schema is a public contract; changing it is a breaking change.
- `/pi-flow:new-feature|improve-arch|debug` and `pipelines.ts` are removed → major version bump. There are no flows until the user runs `/pi-flow:setup` (or writes the file); `/pi-flow:help` prints the schema.
- A seeded built-in is the user's frozen copy; package updates do not change it.
- A restored `pi-flow-state` referencing an unknown flow is cleared on session start.
- A failed stage halts like a `HITL` stop, and models are validated at run start, so an unattended run pauses on trouble instead of cascading.
- Removed: per-skill `completionSignals`, the `gate` field, the `design`/`code` model binary, `artifacts` tracking, and the hardcoded transition-prompt map.
