# Flows are data executed by one generic engine, not hardcoded pipelines

pi-flow originally hardcoded three pipelines in `pipelines.ts`, each a fixed sequence with a `design`/`code` model binary, per-stage prompt strings, and per-skill text `completionSignals` — adding or changing a flow meant editing TypeScript and republishing. We decided a flow is data: an ordered list of `{ skill, model?, mode? }` stages authored in `settings.json`, with the three original flows shipped as built-in defaults that a user-defined flow of the same name overrides. One generic engine runs any flow — it switches the stage's model, sends a generic skill kickoff, and advances on pi's `agent_end` event. A stage's `mode` is the single axis controlling advancement: `AFK` auto-advances on `agent_end` (guarded by generic anti-signals), `HITL` halts for `/pi-flow:next` — so an all-`AFK` flow traverses unattended end to end.

## Considered Options

- **Generalized code presets** — rejected: still needs a code change and republish per flow; contradicts "users trigger flows based on their need."
- **Built-in flows as data, overlaid by user config** — chosen: built-ins ship and work on install; `settings.json` adds or overrides flows by name; both run through the same engine, so there is no second code path.
- **Hybrid (built-in flows in code + config as separate systems)** — rejected: two execution paths to maintain; collapsed into the single-engine option above where built-ins are merely seed data in the user schema.
- **Two-axis mode (autonomy + a separate review gate)** — rejected: the orchestrator only ever decides "wait for a human or roll on," so one `HITL`/`AFK` axis suffices; "review before the next stage" is just a `HITL` stage.
- **Structured completion sentinel / per-skill signal lists** — rejected for v1: `agent_end` plus a generic anti-signal guard works for arbitrary user skills with zero per-skill config. A sentinel token remains a documented upgrade if premature advance proves to be a real problem.

## Consequences

- The `settings.json` flows schema becomes a public contract; changing it is a breaking change.
- `/pi-flow:new-feature|improve-arch|debug` and `pipelines.ts` are removed → major version bump. The flows survive via `/pi-flow:run <name>`; `/pi-flow:show <name>` prints a built-in for copy-paste customization.
- A restored `pi-flow-state` referencing an unknown flow is cleared on session start.
- A failed stage halts like a `HITL` stop, and models are validated at run start, so an unattended run pauses on trouble instead of cascading.
- Removed: per-skill `completionSignals`, the `gate` field, the `design`/`code` model binary, `artifacts` tracking, and the hardcoded transition-prompt map.
