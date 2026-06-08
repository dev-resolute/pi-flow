# Slice 2: CI on main branch

## What to build

Extend the GitHub Actions workflow to also trigger on `push` to `main` and on pull requests targeting `main`. On these triggers, only the test job runs — no version extraction, no publish, no GitHub Release.

This gives two benefits:
- Pushes to `main` get immediate test feedback
- Pull requests show test status as a check, blocking merge of broken code

The workflow should use a single file with conditional steps/jobs based on the trigger event. The test job from Slice 1 is reused as-is; the publish and release steps are gated behind a condition that checks whether the trigger was a tag push.

## Acceptance criteria

- [ ] Push to `main` runs `npm test` and shows result in the GitHub Actions UI
- [ ] Pull request targeting `main` runs `npm test` and appears as a status check on the PR
- [ ] Failed tests on `main` or a PR do not trigger `npm publish` or GitHub Release creation
- [ ] Tag push still triggers the full pipeline (test + publish + release) as in Slice 1

## Blocked by

Slice 1 (0001-basic-release-workflow) — reuses the same workflow file and test job
