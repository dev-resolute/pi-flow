# pi-flow

Run your own multi-stage skill workflows in [pi](https://pi.dev) — pick the model for each skill, and mark which skills need you and which run unattended.

## Concepts

- **Flow** — an ordered list of skills you trigger by name.
- **Stage** — one skill in a flow, with its own optional model and a mode.
- **Mode** — `HITL` (the flow pauses after the skill and waits for `/pi-flow:next`) or `AFK` (the flow auto-advances when the skill's agent run ends). A flow whose stages are all `AFK` runs start to finish unattended.

## Built-in flows

Three flows ship ready to use — no setup required:

| Flow | Stages |
|------|--------|
| `new-feature` | grill-with-docs → to-prd → to-issues → tdd |
| `improve-arch` | improve-codebase-architecture → to-prd → to-issues → tdd |
| `debug` | diagnose → to-prd → to-issues → tdd |

Run one:

```
/pi-flow:run new-feature add dark mode
```

Start typing `/pi-flow:run ` and pi autocompletes your flow names with their descriptions.

## Defining your own flows

Add a top-level `pi-flow` key to your pi `settings.json`. A flow you define with the same name as a built-in overrides it; new names are added alongside the built-ins.

```json
{
  "pi-flow": {
    "flows": {
      "ship-it": {
        "description": "Plan, build, and review",
        "stages": [
          { "skill": "grill-with-docs", "model": "opencode-go/qwen3.7-max", "mode": "HITL" },
          { "skill": "to-prd",          "model": "opencode-go/qwen3.7-max", "mode": "AFK"  },
          { "skill": "tdd",             "model": "opencode-go/kimi-k2.6",   "mode": "AFK"  }
        ]
      }
    }
  }
}
```

Each stage:

- **`skill`** (required) — the pi skill to run.
- **`model`** (optional) — `"provider/id"`. Omit it to keep whatever model is currently active. All models are validated when you start a flow, so a typo fails before the first stage runs.
- **`mode`** (optional) — `HITL` or `AFK`. Defaults to `HITL`, so a stage never runs unattended unless you opt in.

To customise a built-in, print its definition with `/pi-flow:show <name>` and paste it under your `pi-flow.flows`.

## How a flow runs

- On each stage, pi-flow switches to the stage's model (if set) and hands the skill a kickoff message. The first stage receives your `run` input; later stages continue from what the session has produced so far.
- When the agent finishes a stage:
  - **AFK** → advance to the next stage automatically, unless the agent reports it is stuck or has a question (then the flow pauses).
  - **HITL** → pause and wait for `/pi-flow:next`.
- If a stage can't start (unknown or unavailable model), the flow pauses instead of cascading through later stages.
- When the last stage finishes, the flow completes.

Want a checkpoint in an otherwise-unattended flow? Mark that stage `HITL` — that's what it's for.

## Commands

| Command | Description |
|---------|-------------|
| `/pi-flow:run <name> [input]` | Start a flow (autocompletes flow names) |
| `/pi-flow:next` | Advance past a HITL pause |
| `/pi-flow:skip` | Abandon the current stage and move to the next |
| `/pi-flow:retry` | Re-run the current stage |
| `/pi-flow:cancel` | Stop the active flow (produced work stays in the session) |
| `/pi-flow:status` | Show your flows and the active stage |
| `/pi-flow:show <name>` | Print a flow's definition as JSON |

## Setup

```bash
pi install npm:@resolutedev/pi-flow
```

The built-in flows work immediately. Define your own in `settings.json` as shown above. Flow progress is persisted, so a flow survives `/new` and session restarts; if you delete a flow that was mid-run, its leftover state is cleared on the next start.

### For Maintainers: Publishing Releases

The GitHub Actions workflow automatically publishes to npm when a version tag is pushed. To enable this:

1. **Generate an npm access token** with publish permissions:
   ```bash
   npm login
   npm token create --read-only=false
   ```

2. **Add the token to GitHub Secrets**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: the token from step 1

3. **Create a release**:
   ```bash
   npm version patch  # or minor/major
   git push origin main --tags
   ```

The workflow will:
- Run tests
- Extract version from the tag (e.g., `v1.2.3`)
- Patch `package.json` with the version
- Publish to npm with `--access public`
- Create a GitHub Release with auto-generated notes
