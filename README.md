# pi-flow

Multi-stage development workflow orchestrator for [pi](https://pi.dev).

## Workflows

| Command | Stages |
|---------|--------|
| `/pi-flow:new-feature <topic>` | grill-with-docs → to-prd → to-issues → tdd |
| `/pi-flow:improve-arch <repo>` | improve-codebase-architecture → choose → to-prd → to-issues → tdd |
| `/pi-flow:debug <issue>` | diagnose → to-prd → to-issues → tdd |

## Features

- **Automatic model switching**: design model (qwen3.7-max) for planning stages, code model (kimi2.6) for implementation
- **Stage completion detection**: dual-signal strategy with anti-signal override
- **Gate behavior**: pause after grill and issues for review, auto-advance through prd and tdd
- **State persistence**: survives `/new` and session restarts
- **Session recovery**: restores pipeline state on startup, re-notifies if paused at gate

## Setup

```bash
pi install npm:@resolutedev/pi-flow
```

Configure models:
```
/pi-flow:setup
```

Or edit `settings.json`:
```json
{
  "extensions": {
    "pi-flow": {
      "models": {
        "design": "opencode-go/qwen3.7-max",
        "code": "opencode-go/kimi2.6"
      }
    }
  }
}
```

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

## Commands

| Command | Description |
|---------|-------------|
| `/pi-flow:new-feature <topic>` | Start new feature workflow |
| `/pi-flow:improve-arch <repo>` | Start architecture improvement |
| `/pi-flow:debug <issue>` | Start debug workflow |
| `/pi-flow:next` | Advance past a gate |
| `/pi-flow:skip` | Force-advance current stage |
| `/pi-flow:retry` | Re-send current stage prompt |
| `/pi-flow:cancel` | Cancel active pipeline |
| `/pi-flow:status` | Show pipeline status |
| `/pi-flow:setup` | Configure model mappings |
