# Slice 3: Pre-release tag support

## What to build

Enhance the release workflow to detect pre-release version tags and publish them under the `next` npm dist-tag instead of `latest`. This prevents pre-release versions from being installed by default when users run `pi install npm:@resolutedev/pi-flow`.

A tag is a pre-release if its semver version contains a hyphen after the patch number (e.g., `v1.2.0-beta.1`, `v2.0.0-rc.1`). Stable tags have no hyphen (e.g., `v1.2.0`).

The publish step should conditionally add `--tag next` when a pre-release is detected:
- `v1.2.0-beta.1` → `npm publish --access public --tag next`
- `v1.2.0` → `npm publish --access public` (defaults to `latest`)

## Acceptance criteria

- [ ] Pushing `git tag v1.2.0-beta.1 && git push origin v1.2.0-beta.1` publishes `@resolutedev/pi-flow@1.2.0-beta.1` under dist-tag `next`
- [ ] `npm dist-tag ls @resolutedev/pi-flow` shows `next: 1.2.0-beta.1` and `latest` still points to the previous stable version
- [ ] `pi install npm:@resolutedev/pi-flow` installs the `latest` stable version, not the pre-release
- [ ] `pi install npm:@resolutedev/pi-flow@1.2.0-beta.1` installs the pre-release explicitly
- [ ] Stable tags (`v1.2.0`) continue to publish under `latest` as before

## Blocked by

Slice 1 (0001-basic-release-workflow) — extends the publish step
