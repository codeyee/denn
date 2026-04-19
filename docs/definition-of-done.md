# Definition of Done

This Definition of Done applies to `web`, `core`, and `proxy`.

## Required For Every Change

- The change has a reproducible local validation command.
- The relevant CI workflow validates the same behavior before any image publish step.
- Any behavioral change includes tests or a deliberate test update.

## Required For Cross-App Changes

- Compatibility between affected apps is explicitly validated.
- Any shared operating command or workflow change is documented in `docs/`.
- The PR description names affected consumers and the validation performed.

## Quality Gate Expectations

- `web` must keep `npm run lint` and `npm run build` green.
- `core` must keep the default Django test suite green.
- `proxy` must keep the default `go test ./...` suite deterministic and offline-safe.
