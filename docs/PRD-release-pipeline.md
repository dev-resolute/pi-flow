# PRD: GitHub Actions Release Pipeline for pi-flow

## Objective

Automate publishing of `@resolutedev/pi-flow` to the npm registry whenever a version tag is pushed, so that pi users can install it with `pi install npm:@resolutedev/pi-flow`.

## Design Decisions

### 1. Release Trigger — Tag-driven

A human creates a git tag and pushes it. The GitHub Actions workflow fires on tag push events matching `v*`.

- The tag is the release. No separate "release branch" or manual publish step.
- The human decides when to release by tagging. No automation creates tags.

### 2. Version Source of Truth — Git tag

The git tag is the authoritative version number. The workflow:

1. Extracts the version from the tag by stripping the `v` prefix (e.g., `v1.2.0` → `1.2.0`)
2. Patches `package.json` version field in the **build artifact only** (in-memory, before `npm publish`)
3. Publishes the patched artifact to npm

The repo's `package.json` is **not** modified or committed back. This avoids the divergence problem where the tag points to one commit but the version bump creates another.

**Rationale (from grilling):** Committing back creates a new commit that the tag doesn't point to, breaking the invariant that checking out a tag gives you the released version. Option A (patch in artifact only) is the simplest and least surprising approach.

### 3. Tag Format — `v{semver}`

Tags use the `v`-prefixed semver format: `v1.2.0`, `v2.0.0-beta.1`, etc.

- Matches the convention used by `npm version` by default
- Workflow trigger pattern: `on: push: tags: ['v*']`
- Workflow strips `v` prefix to get the npm-compatible version string

## Workflow Steps

```
Tag pushed (v1.2.0)
  │
  ├─► Checkout code at the tagged commit
  ├─► Setup Node.js
  ├─► Install dependencies (npm ci)
  ├─► Run tests (npm test)
  │     └─► Fail → abort, no publish
  ├─► Extract version from tag (strip 'v')
  ├─► Patch package.json version in working tree
  ├─► npm publish --access public
  │     └─► Authenticated via NPM_TOKEN secret
  └─► Create GitHub Release (auto-generated notes from commits)
```

## Constraints

- **No build step.** pi-flow is TypeScript loaded via jiti at runtime. The `files` field in `package.json` already excludes `node_modules/` and `tests/`.
- **Scoped package.** Published as `@resolutedev/pi-flow`. Requires `--access public` since scoped packages default to restricted.
- **Peer dependency.** `@earendil-works/pi-coding-agent` is a peer dependency — not bundled, resolved by the consumer's pi installation.
- **npm authentication.** Requires an `NPM_TOKEN` repository secret with publish permissions on the `@resolutedev` scope.

## Open Questions

These were not resolved during the grilling session and should be decided before implementation:

| Question | Recommended default |
|----------|-------------------|
| Should tests run on `push` to `main` (not just tags)? | Yes — catch breakage before tagging |
| Should a GitHub Release with auto-generated changelog be created? | Yes — standard practice, low cost |
| Which Node.js version for the workflow? | `lts/*` (current LTS at workflow run time) |
| Should pre-release tags (e.g., `v1.2.0-beta.1`) publish under a `next` dist-tag? | Yes — prevents pre-releases from becoming `latest` |
| Should the workflow fail if the npm version already exists? | Yes — `npm publish` already does this by default |

## Success Criteria

- [ ] Pushing `git tag v1.0.0 && git push origin v1.0.0` publishes `@resolutedev/pi-flow@1.0.0` to npm
- [ ] `pi install npm:@resolutedev/pi-flow@v1.0.0` installs and loads the extension
- [ ] Failed tests prevent publishing
- [ ] Pushing a non-version tag (e.g., `docs-update`) does not trigger the workflow
- [ ] Pre-release tag `v1.1.0-beta.1` publishes under `next` dist-tag, not `latest`
