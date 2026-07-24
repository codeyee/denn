# Definition of Done

This Definition of Done applies to `web`, `core`, and `proxy`.

## Required For Every Change

- The change has a reproducible local validation command.
- The relevant CI workflow validates the same behavior before any image publish step.
- Any behavioral change includes tests or a deliberate test update.
- Any touched critical request path runs the production-build browser
  smoke and confirms or updates `.docs/perf/baseline.md`.
- Browser-visible regressions retain a redacted trace/screenshot/network
  artifact and are not hidden by deleting or weakening the scenario.

## Required For Cross-App Changes

- Compatibility between affected apps is explicitly validated.
- Any shared operating command or workflow change is documented in `.docs/`.
- The PR description names affected consumers and the validation performed.

## Quality Gate Expectations

- `web` must keep `pnpm run lint` and `pnpm run build` green.
- `core` must keep the default Django test suite green.
- `proxy` must keep the default `go test ./...` suite deterministic and offline-safe.
- Critical browser flows must keep the stable Playwright smoke green on
  desktop; responsive changes also run the mobile project.
- Performance-impacting changes state the cold/warm and
  cache/data-source state used for comparison.
