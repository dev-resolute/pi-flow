# pi-flow

Run your own multi-stage skill workflows in [pi](https://pi.dev) — pick the model for each skill, and mark which skills need you and which run unattended.

## Concepts

- **Flow** — an ordered list of skills you trigger by name.
- **Stage** — one skill in a flow, with its own optional model and a mode.
- **Mode** — `HITL` (the flow pauses after the skill and waits for `/pi-flow:next`) or `AFK` (the flow auto-advances when the skill's agent run ends). A flow whose stages are all `AFK` runs start to finish unattended.

## Quick start

```bash
pi install npm:@resolutedev/pi-flow
```

Then, in pi, write the three starter flows into your config:

```
/pi-flow:setup
```

That creates `~/.pi/agent/pi-flow.json` with `new-feature`, `improve-arch`, and `debug`. Now run one:

```
/pi-flow:run new-feature add dark mode
```

Start typing `/pi-flow:run ` and pi autocompletes your flow names. Until you run `/pi-flow:setup` (or write the file yourself), there are no flows — `/pi-flow:status` will tell you so.

## Where flows live

All flows — the starter ones and your own — live in a single file you own: **`~/.pi/agent/pi-flow.json`** (alongside pi's own `models.json` / `settings.json`). `/pi-flow:setup` seeds it once with the three built-ins; after that it's yours and pi-flow never rewrites it.

```json
{
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
```

Each stage:

- **`skill`** (required) — the pi skill to run.
- **`model`** (optional) — `"provider/id"`. Omit it to keep whatever model is currently active. All models are validated when you start a flow, so a typo fails before the first stage runs.
- **`mode`** (optional) — `HITL` or `AFK`. Defaults to `HITL`, so a stage never runs unattended unless you opt in.

Run `/pi-flow:help` any time to print this schema.

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
| `/pi-flow:setup` | Write the three starter flows into `~/.pi/agent/pi-flow.json` |
| `/pi-flow:help` | Print the flow schema |
| `/pi-flow:run <name> [input]` | Start a flow (autocompletes flow names) |
| `/pi-flow:next` | Advance past a HITL pause |
| `/pi-flow:skip` | Abandon the current stage and move to the next |
| `/pi-flow:retry` | Re-run the current stage |
| `/pi-flow:cancel` | Stop the active flow (produced work stays in the session) |
| `/pi-flow:status` | Show your flows and the active stage |

Flow progress is persisted, so a flow survives `/new` and session restarts; if you delete a flow that was mid-run, its leftover state is cleared on the next start.

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
