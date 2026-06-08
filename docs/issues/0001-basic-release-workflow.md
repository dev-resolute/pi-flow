# Slice 1: Basic release workflow

## What to build

End-to-end GitHub Actions workflow that publishes `@resolutedev/pi-flow` to the npm registry when a `v*` tag is pushed. The workflow cuts through all layers:

1. **Trigger** — fires on `push: tags: ['v*']`
2. **Environment** — checks out code at the tagged commit, sets up Node.js LTS, runs `npm ci`
3. **Quality gate** — runs `npm test` (vitest). Workflow aborts on failure, no publish occurs.
4. **Version extraction** — strips the `v` prefix from `GITHUB_REF_NAME` (e.g., `v1.0.0` → `1.0.0`), writes it into `package.json` version field in the working tree
5. **Publish** — runs `npm publish --access public` authenticated via `NPM_TOKEN` repository secret
6. **Release** — creates a GitHub Release with auto-generated notes from commits since the previous tag

The workflow lives in a single file. No build step is needed — pi-flow is TypeScript loaded via jiti at runtime. The `files` field in `package.json` already controls what ships in the tarball (`extensions`, `src`, `package.json`, `README.md`, `LICENSE`).

## Acceptance criteria

- [ ] Pushing `git tag v1.0.0 && git push origin v1.0.0` publishes `@resolutedev/pi-flow@1.0.0` to npm
- [ ] `pi install npm:@resolutedev/pi-flow@1.0.0` installs and loads the extension successfully
- [ ] If `npm test` fails, the workflow aborts before `npm publish` — nothing is published
- [ ] Pushing a non-version tag (e.g., `docs-update`) does not trigger the workflow
- [ ] A GitHub Release is created on the tag with auto-generated changelog
- [ ] `NPM_TOKEN` repository secret is documented in README setup instructions

## Blocked by

None — can start immediately
