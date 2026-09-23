# Jev Content Moderation

## Objective

Build a production-capable, server-side Jev moderation capability for persisted and newly ingested content. Ship it initially in shadow/evaluation mode, while implementing an enforcement path that remains disabled until measured go/no-go criteria are satisfied.

## Problem

Denn's upstream providers have inconsistent adult-content metadata. TMDB provides an authoritative flag, while other providers may omit or misclassify safety information. Treating missing metadata as safe can place explicit content on automatic-discovery surfaces.

## Why

- Learn TypeSafe System One and Jev through a real, measured integration.
- Preserve authoritative provider safety signals.
- Add a reusable, explainable moderation record for providers without reliable flags.
- Prepare safe homepage, featured, search, preview, list, and detail behavior without activating unvalidated enforcement.

## Authorized scope

- Normalized text metadata only: provider, content type, title, description, genres, and tags.
- Existing-content backfill and incremental classification for new or refreshed content.
- Persisted versioned judgments, idempotency, staleness, retries, and explicit failure/abstention states.
- Code-owned policy mapping for automatic discovery, direct search, lists, previews, and detail.
- Feature flags for shadow collection and separately gated enforcement.
- API exposure, user preference, tags, blur/censor controls, and homepage/featured suppression path.
- Offline deterministic tests plus an opt-in live evaluation over 300–500 English/Spanish fixtures.
- Architecture, policy, operations, and evaluation documentation.

## Out of scope

- Image moderation.
- Deleting catalog items or blocking direct detail access during evaluation.
- Replacing authoritative provider flags.
- Enabling visible enforcement before go/no-go evidence is accepted.
- Push, pull request creation, merge, deployment, or production backfill.

## Constraints

- `core` owns normalized content, classification persistence, and user preferences.
- `proxy` remains stateless and retains provider-credential ownership and authoritative provider filtering.
- `TYPESAFE_API_KEY` stays server-side and must never reach the browser.
- Unknown, unavailable, stale, or low-confidence Jev output is never silently treated as safe.
- Provider payloads and sensitive preference values must not be logged unnecessarily.
- Classification failures must not fail content ingestion.
- Preserve id-first content routing and existing direct-detail access.
- Artifact language is English.

## Architecture direction

`proxy payload -> core normalized detail upsert -> bounded moderation classification -> versioned judgment -> API moderation summary -> pure surface policy -> web presentation`

Jev supplies independent typed judgments; application code owns precedence, thresholds, abstention, surface policy, and irreversible actions. TMDB's adult flag always wins.

## TDD and validation

- Mode: strict TDD.
- Source: repository `AGENTS.md` (`Strict TDD Mode: enabled`).
- Required cycle per implementation task: observed RED -> GREEN -> REFACTOR.
- Core checks: focused Django tests, then `make validate-core` when the local database harness is available.
- Web checks: focused tests if present, `make validate-web`.
- Repository checks: `make test`, `make validate-proxy`, `make local-smoke`, and `make browser-local` as applicable.
- Live Jev evaluation is opt-in and must not become a hidden CI network dependency.

## Delivery and routing

- Implementation route: delegated direct.
- Trigger evidence: the feature spans multiple non-trivial files across `core`, `web`, tests, migrations, and docs; broad exploration exceeded four files.
- Implementer model: `opencode-go/glm-5.3-flash`.
- Delivery strategy: `ask-on-risk`.
- Forecast: approximately 2,000–3,000 authored changed lines, excluding generated migration output and bulk fixture data.
- Review budget: about 400 authored changed lines per PR slice.
- Chain strategy: `stacked-to-main` (user-selected).

## Tasks

- [x] **JEV-001 — Persist versioned moderation judgments and configuration**
  - Add the moderation domain model, migration, indexes, revisions, feature flags, and admin visibility.
  - Acceptance: identical content/model/question inputs are idempotent; source changes become stale rather than overwriting history; disabled mode performs no remote call.
  - Checks: model/migration/config tests; focused Django test command.
  - Route: delegated; writer trigger (multiple non-trivial files).
  - Result: complete. `ContentModerationJudgment` (`core/content/models/moderation.py`) persists raw typed payload, exact model name, question and policy revisions, status/classification enums, error code, and timestamps. Identity constraint `unique_moderation_judgment_identity(content_item, source_data_hash, model_name, question_revision)` blocks duplicate inference; policy revision is deliberately excluded so policy changes re-evaluate from the stored payload without new rows. `policy_revision` defaults through the serializable callable `content.settings_defaults.current_policy_revision`. Settings are disabled by default (`MODERATION_CLASSIFICATION_ENABLED=False`, `MODERATION_POLICY_MODE=shadow`, model/revision defaults are env-independent) and `TYPESAFE_API_KEY` is not required at import. Admin visibility registered.
  - RED evidence (honest): pre-implementation scratch attempts were flawed — one failed at import time from a runner path artifact, one discovered 0 tests, and one pre-injected settings making config assertions vacuous; the first real-settings run of the suite failed (1 failure + 3 errors) exposing the empty-string default contract violation and an identity-semantics test error. No clean pre-implementation Django-runner RED was captured; disclosed rather than fabricated.
  - GREEN evidence: `DATABASE_URL='sqlite://:memory:' python manage.py test content.tests.test_moderation` -> `Ran 15 tests ... OK`; `makemigrations --check --dry-run` -> `No changes detected`; broader proportional runs `manage.py test content` -> `Ran 275 tests ... OK (skipped=1)` and with the repo-standard `AUTH_COOKIE_SECURE=True` `manage.py test authentication core` -> `Ran 49 tests ... OK`. The worktree private env sets `AUTH_COOKIE_SECURE=False`, which alone causes 2 unrelated auth-cookie failures; documented as environmental.
  - Commit identity: Conventional Commit `feat(content): add versioned Jev moderation judgment model and config` as the JEV-001 work-unit commit on `agent/jev-moderation-persistence` (Slice 1, stacked on Slice 0 `agent/jev-moderation-plan`); the exact SHA is recorded in the follow-up evidence commit.
- Slice evidence: JEV-001 work-unit commit `f86d5a5` (Slice 1, `agent/jev-moderation-persistence`) stacked on Slice 0 `0ee911d` (`agent/jev-moderation-plan`, `docs(odd): add Jev content moderation ODD plan`), targeting `main` at `fcc3886`.
  - Rollback boundary: revert this commit to remove the model, migration 0024, `settings_defaults.py`, admin registration, settings keys, and tests together; no unrelated behavior is touched.

- [ ] **JEV-002 — Integrate TypeSafe and compose code-owned policy**
  - Add the Python SDK dependency, a narrow client adapter, normalized state builder, independent Jev questions, error mapping, and deterministic policy composition.
  - Acceptance: provider flags remain authoritative; sparse/ambiguous/failing results become `needs_review` or `unknown`; raw probabilities and resolved model version are retained.
  - Checks: fake-client RED/GREEN tests for questions, thresholds, provider precedence, errors, timeouts, and no-secret logging.
  - Route: delegated; preparation and writer triggers.

  - [x] **JEV-002A1 — TypeSafe SDK, dependencies, state builder, typed questions** (Slice 2, `agent/jev-moderation-typesafe-foundations`)
    - Slice 2 scope: pinned `typesafe-sdk==0.7.1` (plus exact dependency closure and the `idna` bump required by `httpx2`), added `core/content/moderation/` with `state.py` and `questions.py`, minimal package exports, and offline tests for the state builder and the three typed questions.
    - State builder: `build_moderation_state(provider, content_type, title=None, description=None, genres=None, tags=None)` — non-empty provider/content_type, fail-safe empty title/description, normalized deduped sorted genre/tag lists, exactly six named text-only fields.
    - Three independent typed Noul questions: `adult_content`, `graphic_violence`, `offensive_content`, each with explicit yes/no criteria. Revision constant: `MODERATION_QUESTION_REVISION = "jev-mq-1"`.
    - Commit identity: Conventional Commit `build(deps): pin typesafe-sdk with moderation state and questions` as the JEV-002A1 work-unit commit; exact SHA `baad5a5` on `agent/jev-moderation-typesafe-foundations`, stacked on Slice 1 `agent/jev-moderation-persistence` at `7f96822`, targeting `main` at `fcc3886`.
    - Residual risks: no live Jev call was made; question wording is unmeasured until the JEV-006 evaluation fixtures; the moderation client adapter and its typed error/result mapping land in JEV-002A2 (Slice 3).
  - [x] **JEV-002A2 — moderation client adapter and typed error/result mapping** (Slice 3, `agent/jev-moderation-typesafe-adapter`, stacked on Slice 2)
    - Slice 3 scope: added `errors.py` and `client.py` to the moderation package, expanded the package exports, and added offline tests for the TypeSafe adapter.
    - Adapter: `JevModerationClient` with injectable client/factory (`default_client_factory = TypeSafeClient`), shared `MODERATION_QUESTIONS`, and stable domain error/result mapping into `ModerationUnavailable(code, retry_after_ms=None, detail=None)` for timeout, connection, rate limit, API, response-validation, and missing-answer cases.
    - Offline SDK surface verified from the installed package, not docs alone: `TypeSafeClient.system_one(state, questions, model=...)` sync call, `SystemOneResponse.nouls` / `.model` / `.usage`, `Noul(instructions, criteria={"true": ..., "false": ...})`, and exception constructors for timeout, rate limit (with `retry_after_ms`), connection, API, and response-validation errors.
    - RED evidence: focused suite before `core/content/moderation/` existed → `FAILED (errors=3)` with `ModuleNotFoundError: No module named 'content.moderation'`.
    - GREEN evidence: full focused suite on the final adapter checkout → `Ran 18 tests ... OK`; pre-existing `content.tests.test_moderation` still `Ran 15 tests ... OK`; `makemigrations --check --dry-run` → `No changes detected` (models untouched).
    - Commit identity: Conventional Commit `feat(content): add moderation client adapter with typed error mapping` as the JEV-002A2 work-unit commit; exact SHA `8a61347` on `agent/jev-moderation-typesafe-adapter`, stacked on Slice 2 `baad5a5`, targeting `main` at `fcc3886`.
    - Rollback boundary: reverting this commit removes the adapter/errors modules, their tests, and their part of the package exports; reverting the foundations slice removes the dependency pins, state/questions modules, and the state/question tests; no JEV-001 behavior is touched.
    - Residual risks: no live Jev call was made in any slice; question wording is unmeasured until the JEV-006 evaluation fixtures; the adapter returns plain floats without threshold policy — policy composition is deliberately deferred to JEV-002B.

- [ ] **JEV-003 — Classify existing and newly refreshed content**
  - Add a resumable/rate-bounded backfill command and non-blocking incremental scheduling after normalized detail upserts.
  - Acceptance: fresh judgments are skipped, changed inputs reclassify, concurrent duplicates collapse, failures do not break ingestion, and backfill can resume safely.
  - Checks: command, ingestion, idempotency, concurrency, and failure tests.
  - Route: delegated; writer trigger.

- [ ] **JEV-004 — Expose moderation state and preference through Core APIs**
  - Add a stable moderation summary to relevant content serializers and a mature-content preference without logging preference values.
  - Acceptance: API remains backward compatible; absent/stale/error judgments are explicit; preference defaults safely.
  - Checks: serializer, profile, permissions, query-count, and API-schema tests.
  - Route: delegated; writer trigger.

- [ ] **JEV-005 — Implement disabled-by-default web enforcement path**
  - Add a pure surface-policy module and UI behavior for badges, blur/reveal, placeholders, homepage/featured suppression, search/list annotations, detail access, and settings.
  - Acceptance: shadow mode produces zero visible behavior change; enforcement flags apply surface-specific behavior; accessibility, stable layout, SSR, and cache keys are preserved.
  - Checks: policy/component tests, `make validate-web`, browser scenarios for default and opt-in users.
  - Route: delegated; writer trigger.

- [ ] **JEV-006 — Build the evaluation harness and go/no-go evidence**
  - Add 300–500 balanced EN/ES cross-provider fixtures, an offline fake-client metric suite, an opt-in live Jev runner, and a report template.
  - Acceptance: report precision, recall, false-negative rate, abstention coverage, latency p50/p95, cost, language split, provider split, and surface-specific recommendation.
  - Checks: deterministic offline evaluation tests; one explicitly authorized live sample before any large paid run.
  - Route: delegated; preparation and writer triggers.

- [ ] **JEV-007 — Document architecture, operations, and rollout**
  - Update content eligibility, current architecture, feature documentation, internal API contract if changed, environment reference, and runbooks for backfill/evaluation/rollback.
  - Acceptance: shadow, activation, rollback, model/question/policy versioning, and production safeguards are unambiguous.
  - Checks: documentation links resolve; commands match implementation; final cross-service validation results are recorded.
  - Route: delegated; writer trigger.

## Progress and evidence

- Exploration completed by GLM 5.3 Flash in Codex task `01a0c4cd-9ceb-7ba0-a7c1-2d6214d81d8b`.
- Verified existing authoritative content policy in `.docs/architecture/content-eligibility.md`.
- Verified existing `UserPreferences.allow_adult_content` and settings UI precedent.
- Verified no current moderation judgment model or TypeSafe SDK dependency.
- JEV-001 implemented and verified; JEV-002 and later tasks not started.

## Next step

Start JEV-002 (TypeSafe client adapter, state builder, question definitions, code-owned policy composition) on the same branch. PR slice 1 targets `main` and contains only JEV-001.
