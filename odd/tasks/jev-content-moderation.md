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

- Build Jev state from provider/content type and safety-relevant text that Core already persists and reconstructs: common title/description; movie/TV original titles and taglines; game themes, modes, type, and series; season parent-show context and episode titles/descriptions; album artists, track titles, and relevant credits; and book authors. Do not treat unpersisted genres, tags, or provider flags as present.
- Keep Jev input to relevant text. Omit identifiers, URLs, images/artwork, dates, durations, and unrelated metadata. JEV-002-Q3 must not fetch missing provider fields or persist new provider data; future ingestion candidates are tracked in [the provider metadata backlog](../../.docs/ideas/jev-provider-metadata-for-content-moderation.md).
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

- Mode: strict TDD is disabled.
- Source: repository `AGENTS.md` (`Strict TDD Mode: disabled`).
- Required cycle per implementation task: direct implementation with applicable functional checks; strict RED -> GREEN -> REFACTOR cycles are not required.
- Core checks: focused Django tests, then `make validate-core` when the local database harness is available.
- Web checks: focused tests if present, `make validate-web`.
- Repository checks: `make test`, `make validate-proxy`, `make local-smoke`, and `make browser-local` as applicable.
- Live Jev evaluation is opt-in and must not become a hidden CI network dependency.

## Delivery and routing

- Implementation route: delegated direct.
- Trigger evidence: the feature spans multiple non-trivial files across `core`, `web`, tests, migrations, and docs; broad exploration exceeded four files.
- Implementer model: `opencode-go/glm-5.3-flash`.
- Delivery strategy: `auto-chain`.
- Forecast: approximately 2,000–3,000 authored changed lines, excluding generated migration output and bulk fixture data.
- Review budget: about 400 authored changed lines per PR slice.
- Chain strategy: `stacked-to-main` (unchanged).

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

  - [x] **JEV-002A — TypeSafe adapter, state, questions, and contract fix (complete)**.
    - Hygiene correction: JEV-002A1 wording now names the issue #102 question keys and the settings-sourced revision; the disabled-mode test lost its dead placeholder code and now asserts no client construction via a failing injected factory; the usage test asserts `assertFalse(hasattr(judgment, "latency_ms"))`.
    - Correction commit: `446b1ec` (`test(content): harden disabled-mode moderation coverage and ODD currency`). Verification: focused suite → `Found 22 test(s)` / OK; prior `content.tests.test_moderation` → `Found 15 test(s)` / OK; `makemigrations --check --dry-run` → `No changes detected`; client tests deterministically OK with `TYPESAFE_API_KEY` absent and set, no network; 361dcf5..HEAD numstat `0/22` test, `5/2` doc (27 authored changed lines), slice below the 400-line budget.

  - [x] **JEV-002B — Deterministic policy composer** (new stacked slice on `d6e921e` via `agent/jev-moderation-policy`)
    - Scope: pure, typed, code-owned policy composer `core/content/moderation/policy.py` over the three raw probabilities and the provider explicit flag; no SDK import, no persistence, no Jev call, no network.
    - Contract: provider affirmative explicit flag is the hard authoritative override (always `explicit_or_sensitive`, never safe); `False`/absent never certifies safety. Jev is advisory: `explicit >= threshold` fails closed to `explicit_or_sensitive`; `review >= threshold` becomes `needs_review`; `safe` discovery only when safe is at/above threshold AND both others are below. Missing/incomplete answers fail closed to `needs_review`; invalid/non-finite/out-of-range inputs fail closed to `unknown`; expected unavailable/skipped outcomes never raise. Raw probabilities are preserved by the caller's payload; the composer returns decision/reason only.
    - Thresholds are configurable via `PolicyThresholds` and validated as finite floats in [0, 1]. Defaults (0.75/0.75/0.75) are provisional and NOT production-tuned; enforcement remains disabled/shadow-only until JEV-005.
    - Tests: offline table-driven `core/content/tests/test_jev_moderation_policy.py` (15 tests): provider override, provider False/absent never-safe, safe/explicit/review at-boundary equality, safe below threshold, contradictions, incomplete/missing/None, non-finite/out-of-range/non-numeric -> unknown, corrupt-provider-flag never-safe, true override with garbage probabilities, threshold validation rejection, custom-threshold boundary behavior.
    - Safety correction (verified MEDIUM fail-open, fixed): an earlier draft only identity-checked `provider_explicit is True`, so corrupt truthy values (1, 1.0, true-like strings, collections) flowed through as non-explicit and could yield `safe_for_automatic_discovery` with high safe probability. Correction: only exact `True` short-circuits; exact `False`/`None` follow Jev; every other value returns `unknown` with reason `corrupt_provider_explicit_input` and never raises. Tests: true override short-circuits even with garbage probabilities, corrupt flag values never become safe and never raise, exact bool/None naming. Correction commit: `75587e4`.
    - No-secret logging is structurally verified (the composer returns/reasons only; it performs no logging and imports no logging module) but has no dedicated test; not fabricated because it does not clearly belong in the owned policy files.
    - Slice arithmetic (supersedes all earlier per-commit totals; final full slice `d6e921e..HEAD` after this documentation correction): policy.py 126/0, policy tests 116/0, ODD doc 13/3; additions 255, deletions 3, authored total 258 (additions + deletions), within the 400-line budget.
    - Commit identity: Conventional Commit `feat(content): add deterministic Jev moderation policy composer`, exact SHA `17a65a7` on `agent/jev-moderation-policy`, stacked on `d6e921e` (`agent/jev-moderation-typesafe-client`), targeting `main` at `fcc3886`. Verification: policy suite final count `Found 15 / OK`; focused 22-test suite OK; persistence 15-test suite OK; full moderation suite `Ran 312 tests ... OK (skipped=1)`; `makemigrations --check --dry-run` -> `No changes detected`; `git diff --check d6e921e..HEAD` whitespace-clean; no network or live Jev call in any check.

  - [x] **JEV-002A1 — TypeSafe SDK, dependencies, state builder, typed questions** (Slice 2, `agent/jev-moderation-typesafe-foundations`)
    - Slice 2 scope: pinned `typesafe-sdk==0.7.1` (plus exact dependency closure and the `idna` bump required by `httpx2`), added `core/content/moderation/` with `state.py` and `questions.py`, minimal package exports, and offline tests for the state builder and the three typed questions.
    - State builder: `build_moderation_state(provider, content_type, title=None, description=None, genres=None, tags=None)` — non-empty provider/content_type, fail-safe empty title/description, normalized deduped sorted genre/tag lists, exactly six named text-only fields.
    - Three independent typed Noul questions: `safe_for_automatic_discovery`, `explicit_or_sensitive`, and `needs_review`, each with explicit yes/no criteria. The question revision originates only from `settings.MODERATION_QUESTION_REVISION` via `moderation_question_revision()`.
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
  - [x] **JEV-002A-CONTRACT-FIX — issue #102 contract correction** (new stacked slice on `a1b6bbf`)
    - Scope: corrected the three typed Noul question keys to the issue #102 contract (`safe_for_automatic_discovery`, `explicit_or_sensitive`, `needs_review`), where `needs_review` explicitly judges sparse, ambiguous, contradictory, or insufficient metadata; made `MODERATION_CLASSIFICATION_ENABLED` gate client resolution/calls with a typed `ModerationSkipped(code="moderation_disabled")` outcome before `TYPESAFE_API_KEY` matters; wired `settings.MODERATION_MODEL` when no explicit override is given; preserved SDK `response.usage` as `UsageTokens(input_tokens, output_tokens)` with latency documented as N/D; removed the conflicting hardcoded question-revision constant in favor of the configured settings revision via `moderation_question_revision()`; made the default-factory/config tests deterministic in both present and absent ambient `TYPESAFE_API_KEY` states with no network calls.
    - Legendary verification finding: independent verification FAILed on these exact deviations (wrong question keys, missing disabled gate, missing usage preservation, env-dependent factory tests, conflicting revision constant). The `build(deps)` commit typing is accepted historical metadata and not a behavioral risk.
    - Verification RED/functional start: `Ran 6 tests ... FAILED (failures=1, errors=2)` under the new contract questions plus `ImportError: cannot import name 'moderation_question_revision'`; the TypeError/string-isinstance and cover-in-discovery substring false positives were test-script bugs, fixed in the same bounded correction.
    - GREEN/functional checks: focused suite → `Ran 22 tests ... OK`; prior JEV-001 tests → `Ran 15 tests ... OK`; `makemigrations --check --dry-run` → `No changes detected`; import sanity → all ten moderation package exports resolve; `git diff --check 8a61347..HEAD` whitespace-clean.
    - Residual risks (updated): per-state text normalization is unchanged; no live Jev call in any slice; the configured settings revision is authoritative from the settings layer only.

  - [x] **JEV-002-Q2 — Refine Jev moderation questions and default revision**
    - Route: delegated.
    - Objective: replace metadata-completeness wording with narrow safety-boundary questions and move the runtime default semantic question revision from `q1` to `q2` without changing the Noul IDs, moderation state, policy thresholds, or provider override.
    - Scope: moderation question definitions, the runtime revision default, focused offline question/settings/state/policy tests, and the minimum documentation that records the default revision. Existing `q1` judgments remain immutable and reusable only under `q1`; `q2` judgments use a distinct identity.
    - Generic baseline finding: an authorized baseline left most items in `needs_review`; only items with richer descriptive metadata were safe, indicating that the `q1` `needs_review` question tracked metadata completeness rather than moderation risk.
    - Acceptance criteria:
      - `safe_for_automatic_discovery` includes ordinary mature entertainment and returns false only for concrete restricted-category evidence.
      - `explicit_or_sensitive` is true only for clearly indicated restricted categories and does not infer restriction from provider or content type alone.
      - `needs_review` is true only for concrete but ambiguous or contradictory restricted-category signals; sparse metadata and ordinary mature themes are false.
      - The three existing question IDs and code-owned thresholds remain unchanged, and no state fields, models, or migrations are added.
      - The runtime default revision is `q2`, while configured revisions and existing `q1` identities remain supported.
    - Checks: focused offline moderation question/settings/state/policy tests; full Django `content` test suite; `python manage.py makemigrations --check --dry-run`; `git diff --check`. No live TypeSafe calls.
    - `strict_tdd=false`.
    - Implementation: rewrote all three Noul instruction/criteria pairs around concrete restricted-category evidence, changed the settings fallback to `q2`, and added offline assertions for the ordinary-content and ambiguity boundaries plus the new default. No state, model, migration, policy threshold, or provider-override changes.
    - Verification: focused suite `Ran 41 tests ... OK`; full `content` suite `Ran 372 tests ... OK (skipped=1)`; `makemigrations --check --dry-run` reported `No changes detected`; `git diff --check` clean. No live TypeSafe/provider calls.
    - Work-unit commit: `5b9b928` (`feat(content): refine Jev moderation question revision`), 143 authored lines.

  - [x] **JEV-002-Q3 — Use persisted type-specific text in Jev state**
    - Route: delegated; state, question, and test changes cross multiple non-trivial files.
    - Objective: improve Jev's safety evidence using only relevant text that Core already persists and reconstructs for each content type.
    - Scope: extend the named moderation state with the applicable existing text: movie/TV original titles and taglines; game themes, modes, type, and series; season parent-show context and episode titles/descriptions; album artists, track titles, and relevant credits; and book authors. Preserve common title/description and current question IDs.
    - Acceptance criteria:
      - Optional type-specific fields are explicit, normalized, and populated only from existing Core persistence; absent values remain absent rather than being fetched or invented.
      - Jev receives no irrelevant identifiers, URLs, assets, dates, durations, or raw provider payloads.
      - The state hash changes when selected text changes and remains deterministic for equivalent normalized state.
      - The default semantic question revision advances to `q3`; prior `q1`/`q2` judgments remain immutable and are not reused for q3.
      - Existing Noul IDs, provider override, and policy thresholds remain unchanged.
    - Checks: focused offline state/hash/question tests and the applicable Core test suite; no provider calls or live Jev calls.
    - Exclusions: provider metadata ingestion, upstream API calls, and new persistence fields; future capture is a separate backlog item.
    - `strict_tdd=false`.
    - Result: the named state keeps common `title`/`description` and selects only applicable text under `type_specific`: movie/TV `original_title` and `tagline`; game `genres`, `themes`, `game_modes`, `game_type`, and `series`; season `parent_show_name` plus every episode's `title`/`description`; album `artists` plus every track's `title` and name/role credits; book `authors`. Normalization and canonical JSON hashing are deterministic; genre and theme remain separate. Missing text stays empty, malformed reconstructed fields fail closed, and non-allowlisted identifiers, URLs, assets, dates, durations, raw payloads, and provider age/adult/explicit flags are excluded. Existing Noul IDs, binary explicit-safety intent, internal fail-closed review/abstention, provider override, q2 thresholds/policy, and q1/q2 rows are preserved; q3 is the default question revision.
    - Work-unit commits: Slice 1 `44a5eca8b2c64aa90d9a74f83d64d3662794760d` (`feat(content): use movie, TV, and game text in Jev state`), 375 authored changed lines; Slice 2 `1c7c6d62f9ad85df3fcd0a946b98720bc458cdac` (`feat(content): include season, album, and book text in Jev state`), 228 authored changed lines. Each behavior slice includes its focused tests and remains under the 400-line slice budget; Slice 2 is stacked on Slice 1. No PR or push was created.
    - Verification: `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content.tests.test_jev_moderation_state content.tests.test_jev_moderation_questions content.tests.test_jev_moderation_service content.tests.test_moderation content.tests.test_jev_moderation_policy content.tests.test_payload_reconstructor` -> 81 tests OK; the same environment/runner with `manage.py test content` -> 379 tests OK (1 skipped); `manage.py makemigrations --check --dry-run` -> `No changes detected`. The requested bare `python` command could not start (exit 127, `python: command not found`); used the existing workspace venv runner instead. The explicit non-secret setting override avoids two default-setting assertions failing under the inherited environment. `git diff --check` passed before both work-unit commits and `git show --check` passed for both commits.
    - Runtime harness: N/A; state and service behavior were verified offline with fake clients. No live Jev or provider call was made.
    - Caveat: all episode and track text is retained; no silent text bound was added. Actual prompt-size/token/cost impact was not measured. Any future bound must expose incompleteness and must not let omitted evidence count as safe.
    - Rollback boundary: revert Slice 2, then Slice 1, to return to the q2 state projection; reverting Slice 2 alone leaves the movie/TV/game q3 slice in place.
    - Independent-review correction: when `SeasonDetail.tv_show_name` is blank, the season reconstructor now falls back to the linked persisted `TvShowDetail.title`; a nonblank season-level name remains authoritative. No provider call or q3 prompt/policy change.
    - Regression evidence: the persisted linked-show/season test first failed with an empty `parent_show_name`, then passed after the fix and verified that changing the linked show's stored title changes the state and source hash. Focused command `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content.tests.test_jev_moderation_state content.tests.test_jev_moderation_questions content.tests.test_jev_moderation_service content.tests.test_moderation content.tests.test_jev_moderation_policy content.tests.test_payload_reconstructor` -> 82 tests OK.
    - Correction verification: the first full-suite attempt failed only because the existing atomic-report test could not create its temporary file in the sandbox; after narrow filesystem escalation, `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content` -> 380 tests OK (1 skipped). `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py makemigrations --check --dry-run` -> `No changes detected`. No live Jev/provider calls; runtime harness N/A.
    - Correction commit: `24e4a5ae5f81a30d54b66c709edb2ea9827ba7cf` (`fix(content): restore linked season parent show title`), 60 authored changed lines; `git show --check --stat --oneline HEAD` passed. Revert this commit to restore the previous season reconstruction behavior.

  - [ ] **JEV-003 — Classify existing and newly refreshed content**
  - Add a resumable/rate-bounded backfill command and non-blocking incremental scheduling after normalized detail upserts.
  - Acceptance: fresh judgments are skipped, changed inputs reclassify, concurrent duplicates collapse, failures do not break ingestion, and backfill can resume safely.
  - Checks: command, ingestion, idempotency, concurrency, and failure tests.
  - Route: delegated; writer trigger.
  - Current state: JEV-003A is accepted; the next unit is JEV-003B backfill (JEV-003C incremental scheduling follows).

  - [x] **JEV-003A — Deterministic per-item classification service** (new stacked slice on `23b3306` via `agent/jev-moderation-classification-service`)
    - Scope: pure service `core/content/services/moderation_service.py`. Builds the normalized six-field state from `payload_reconstructor.from_local`, computes the source_data_hash inline with canonical JSON (`json.dumps(..., sort_keys=True, ensure_ascii=False, separators=(',', ':'))`) and `hashlib.sha256`, reuses complete judgments with the same identity, persists COMPLETE rows with a typed unavailable outcome instead of ERROR rows, and short-circuits the provider-explicit path without a client call. No scheduling, backfill, UI, API, or background mechanism is touched.
    - Provider explicit: only the TMDB affirmative adult flag may set `provider_explicit=True`. Per the adult-safety boundary, no IGDB/Spotify/OpenLibrary equivalent is normalized, and no persisted adult flag exists yet in the local Detail normalize path, so in current production the override path stays structurally unsupported (provider_explicit stays None for every item). This is reported, not fabricated.
    - Result types: returns either a persisted `ContentModerationJudgment` or a typed `ModerationClassificationOutcome` (`skipped|unavailable`); the disabled path returns `moderation_disabled` without constructing a client or writing a fake row; `ModerationUnavailable` returns a typed `unavailable` outcome with the adapter's code, no ERROR row, and never breaks the caller.
    - Payload honestly retains: raw_nouls, model, usage (input/output tokens, None on the provider-override path), policy decision/reason, policy_thresholds, source_state, provider_explicit, classification_ms (service-measured wall clock), and `requested_at`/`completed_at` on the judgment row itself. Token usage plus timestamps needed by the JEV-003B reporting contract are all persisted on every Jev write.
    - Tests: offline table-driven `core/content/tests/test_jev_moderation_service.py` (16 tests after the correction slice): state/hash determinism with distinct items, changed-input rehash, alias resolution and stale-pre-reuse protection, idempotent reuse without a second call (concrete resolution only), changed input reclassification, disabled mode (no client, no write), provider override short-circuits without a Jev call, successful raw_nouls + usage + classification_ms persistence, unavailable returns a typed outcome with no row, non-TMDB providers never certify safety, missing-detail returns `state_unavailable`, no PENDING state after success, canonical 64-hex hash, injected IntegrityError race collapse, and `provider-rule:v1` audit identity.
    - Repo infrastructure gap (reported, not invented): the repo has no established queue, thread worker, celery, or async scheduling layer for the JEV-003C incremental hook. `fetch_bulk_source_data` is synchronous and the only local scheduler is management-command-driven. A real queue/worker decision is a product/architecture call that must come from the parent before any scheduler code.
  - [x] **JEV-003A-CLASSIFICATION-FIX — moderation identity contract correction** (correction slice on `agent/jev-moderation-classification-fix`, based at `bb09dba`)
    - Fix: inference identity now derives from the concrete resolved model returned by the client (`jev-1.13.0`), not the requested alias. Alias-only requests (`jev-latest`) skip pre-reuse and always perform the classify call, so distinct resolutions never collapse onto a stale judgment; the concrete resolution path still reuses deterministically. Provider overrides keep `provider-rule:v1` as the persisted `model_name` and record the resolved-vs-requested distinction in the payload.
    - Tests added (9 above the base 7 in `bb09dba`): alias resolution records the concrete `model_name` plus the requested alias, repeated alias requests perform a second call instead of stale pre-reuse, missing normalized detail returns `state_unavailable` with zero calls/writes, no PENDING row is ever left behind after a complete judgment, canonical hash is a non-empty 64-hex digest, injected `IntegrityError` collapses to the existing judgment row, provider override writes the `provider-rule:v1` audit identity with empty `raw_nouls`, deterministic and changed-input state-hash coverage, and non-TMDB providers never certify safety. Total service suite: 16 tests.
    - Commit identity: Conventional Commit `fix(content): resolve moderation identity from concrete Jev model`, exact SHA `17fc476` on `agent/jev-moderation-classification-fix`, stacked on `bb09dba`. Slice arithmetic `bb09dba..4e504f5`: `moderation_service.py` +132/-69, `test_jev_moderation_service.py` +82/-10, ODD doc +7/-1; total +221/-80 = 301 authored lines, within the 400-line budget.
    - Independent verifier: PASS. Exact checks: service suite 16 OK; all moderation suites 68 OK; `content` app suite 328 OK (skipped=1); `makemigrations --check --dry-run` `No changes detected`; diff checks clean; worktree clean with HEAD equal to `origin/agent/jev-moderation-classification-fix` at `4e504f5` before this verification correction. No live Jev call; all coverage is offline against injected fakes.
    - Residual risks: `_KNOWN_ALIASES` currently explicitly recognizes only `jev-latest`; a repeated alias call incurs a Jev request even when the concrete model is unchanged; the empty/whitespace resolved-model branch returns `typesafe_response_invalid` but lacks a dedicated unit test; combined `23b3306..4e504f5` is 507 authored lines and must not become one >400 PR slice under `auto-chain` (split by work-unit boundary at `bb09dba`).

- [ ] **JEV-004 — Expose moderation state and preference through Core APIs**
  - Add a stable moderation summary to relevant content serializers and a mature-content preference without logging preference values.
  - Acceptance: API remains backward compatible; absent/stale/error judgments are explicit; preference defaults safely.
  - Checks: serializer, profile, permissions, query-count, and API-schema tests.
  - Route: delegated; writer trigger.
  - [x] **JEV-004A — Expose a bounded read-only moderation summary from Core**
    - Scope: add an additive `moderation` summary to existing ContentItem detail/list and LocalContentSummary API surfaces. Expose only status (`missing`, `pending`, `complete`, `stale`, or `error`) and a valid classification (`safe`, `explicit`, or `needs_review`) when present. Preserve current production-passive behavior.
    - Exclusions: user preference/profile changes, Web UI or enforcement, classification policy changes, Jev calls, backfill, raw judgment payloads, probabilities, hashes, token usage, and private evidence.
    - Acceptance: stale, errored, missing, pending, malformed, or otherwise invalid judgments are never reported as safe; complete valid judgments expose only the allowlisted summary; list responses avoid N+1 queries; API schema and English contract docs match the response.
    - Checks: `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content`; the same environment and runner with `manage.py makemigrations --check --dry-run`; `git show --check <commit>`.
    - Route: delegated direct; writer trigger (Core serializers/querysets, tests, schema, and API docs are a multi-file behavior change).
    - Result: complete. ContentItem detail/list and LocalContentSummary now expose only the public status/classification pair. List serializers use latest-row prefetches; public profile overview uses scalar annotations to preserve its existing query budget. No Jev calls, preference changes, policy changes, backfill, or remote operations were performed.
    - Verification: exact `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content` -> 390 tests passed (1 skipped); exact same environment and runner with `manage.py makemigrations --check --dry-run` -> `No changes detected`; `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test authentication.tests.test_public_profiles` -> 25 tests passed; `git diff --check` and `git show --check 920a55d0ad035bc09447bafb1e230da85d74b87a` -> pass.
    - Commit identity: `feat(content): expose read-only moderation summaries`, `920a55d0ad035bc09447bafb1e230da85d74b87a` on `agent/jev-moderation-core-summary`.
    - Slice note: 473 authored changed lines exceed the ~400-line planning advisory because the additive API contract needs the bounded latest-row selection, nested queryset wiring, status/privacy/schema coverage, and existing profile query-budget preservation together; no tests or docs were omitted.
    - Limitation at JEV-004A: `complete` represented the latest stored row only; detail-response freshness is addressed in JEV-004B, while list/profile freshness remains open in JEV-004C.
  - [x] **JEV-004B — Compare detail moderation summary with returned source data**
    - Scope: fail closed on `safe` or `explicit` judgments when their source hash does not match the normalized text in the source payload returned by the id-first detail response. Keep comparison in the serializer path using the existing bulk source-data cache; do not read raw judgment fields into the API.
    - Guardrails: do not alter preferences, enforcement, classification, list/profile semantics, Jev calls, backfill, or production data. List and bulk serialization must not introduce per-item queries.
    - Checks: focused moderation summary API tests and the full `content` suite; `makemigrations --check --dry-run`; `git diff/show --check`.
    - Route: delegated direct; detail summary, tests, docs, and tracker evidence form one bounded Core API change.
    - Result: id-first detail summaries compare the latest row's source hash with the exact source payload used in the same response. A mismatch returns `stale` with no classification. The response source cache keeps refresh behavior aligned with the metadata the caller actually receives. The summary-hash annotation/prefetch remains scalar/batched; no N+1 was introduced.
    - Limitation: ordinary ContentItem list and local profile summaries still report the latest persisted judgment without checking it against current normalized data. Do not use these summaries as current homepage-safety proof. JEV-004C tracks a batched/materialized freshness seam for those paths.
    - Verification: `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content.tests.test_moderation_summary_api` -> 14 tests OK; exact requested full command `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content` -> 399 tests OK (1 skipped) after the initial sandbox-only report-path failure and narrow approval for the same command; exact requested migration check -> `No changes detected`; `git diff --check` -> pass.
    - Runtime harness: N/A; this is a passive API summary change, and no local-stack or provider behavior was modified.
    - Commit identity: `fix(content): mark changed moderation summaries stale`, `62e3c207bef1810c1ca5f6f2fae943204e4b1429` on `agent/jev-moderation-summary-freshness`.
    - Rollback boundary: revert this work-unit commit to restore the prior detail summary behavior; it changes no schema or judgment rows.
  - [x] **JEV-004C — Batch current-source freshness for list and profile summaries**
    - Scope: provide a batched/materialized current normalized-source hash for list, profile, and other summary paths so stale `safe` or `explicit` judgments cannot be consumed as current without adding per-item queries.
    - Acceptance: changed normalized text makes the public summary stale with no classification across these paths; query-count tests prove a bounded batch cost rather than N+1; no raw hashes or judgment internals are exposed; homepage consumers cannot treat unmatched/missing freshness evidence as safe.
    - Result: added nullable `ContentItem.current_moderation_source_hash` without a data migration. Both full-detail write paths persist the hash atomically with normalized detail. List/profile summaries report stale when the latest complete judgment hash is missing or differs; detail responses retain comparison with the exact returned payload. TV-show title changes invalidate dependent season hashes whose local show name is inherited; nested season upserts recompute their hash. Added bounded `backfill_moderation_source_hashes --limit N [--after-id ID]` to materialize missing hashes from local persisted detail only. Raw hashes remain private.
    - Verification: focused `content.tests.test_moderation_summary_api content.tests.test_moderation_source_hash content.tests.test_source_data_orchestrator` -> 32 tests OK; summary annotation is one query and prefetched list serialization adds zero queries. Exact required `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content` -> 406 tests OK (1 skipped); exact migration check -> `No changes detected`; `git diff --check` and `git show --check 31729a5` -> pass. The first full-suite attempt was blocked by sandbox writes for existing temporary report tests; the exact rerun with narrow filesystem approval passed.
    - Runtime harness: N/A; the work changes passive Core summaries and normalized detail persistence. No live Jev call, production data migration/backfill, or remote operation was performed.
    - Commit identity: `feat(content): materialize current moderation freshness`, `31729a5d4971e97595d96dae85d4c148b45310cb` on `agent/jev-moderation-current-hash`; 484 authored changed lines across Core schema/persistence/query, tests, and API architecture docs.
    - Rollback boundary: revert `31729a5` to remove the nullable field/migration, persistence hooks, bounded hash command, summary freshness check, tests, and matching docs. No judgment rows are rewritten.
    - Route: delegated direct; Core model, both full-detail write paths, public summary logic, tests, and API documentation form one bounded behavior change.
  - User preference/profile exposure remains part of JEV-004 but is not included in JEV-004A.

- [ ] **JEV-005 — Implement disabled-by-default web enforcement path**
  - Add a pure surface-policy module and UI behavior for badges, blur/reveal, placeholders, homepage/featured suppression, search/list annotations, detail access, and settings.
  - Acceptance: shadow mode produces zero visible behavior change; enforcement flags apply surface-specific behavior; accessibility, stable layout, SSR, and cache keys are preserved.
  - Checks: policy/component tests, `make validate-web`, browser scenarios for default and opt-in users.
  - Route: delegated; writer trigger.
  - [x] **JEV-005-REVEAL — Keep explicit-artwork reveal control in an upper corner**
    - Scope: replace the centered text pill with a compact icon-only Eye/EyeOff button, preserve its accessible name and pressed state, reserve space below both top badge slots, and prevent its click from triggering card navigation.
    - Guardrail: apply only to complete explicit judgments; preserve development-only route behavior and do not imply the blur blocks image access.
    - Checks: focused keyboard/touch/accessibility and card-layout tests for both badge slots; mapped Web container Vitest, lint, build, and auth-card budget check.
    - Route: delegated direct; component, card placement, and tests form one bounded UI behavior.
    - Implementation: the reveal is icon-only with a 44×44 CSS target, accessible title/label, `aria-pressed`, visible keyboard focus, and click interception. The two top badges share a row; the reveal control is stacked below them at the upper-right edge. Blur eligibility remains complete + explicit; `needs_review` does not show the control.
    - Verification: in `denn-agent-jev-moderation-backfill-web-1` (`/app` mapped to this worktree), `pnpm exec vitest run src/test/moderation-reveal-button.test.tsx` -> 4 tests passed; `pnpm run lint` -> pass; `pnpm run cards:check` -> 150 WebP files valid, 3,539,278 bytes; `pnpm run build` -> pass. Build warnings: one existing >500 kB client chunk and Nitro's missing `compatibilityDate` fallback. Build emitted `dev.moderation-preview-*` client and server chunks. `git diff --check` -> pass.
    - Browser visual readback (parent): PASS. The synthetic fixture toggled Eye/EyeOff; stored Core ContentItem `#1947` blurred and revealed its explicit artwork; the compact top-right control did not cover the main artwork.
    - Parent verification: `pnpm exec vitest run src/test/moderation-reveal-button.test.tsx` -> 4/4 PASS in the existing Web container. Native assessment: RDD off, risk medium, `review_due=false` (`under_budget`) against base `38f8998`; this is assessment evidence, not a review receipt.
    - No route removal, production deploy, production backfill, or live Jev call was performed.
    - Commit identity: `feat(web): refine moderation artwork reveal flow`, `aac1f69` on `agent/jev-moderation-ux-decisions`.
  - [x] **JEV-005-LOCAL-PREVIEW — Show the moderation visual safely in the local Web app**
    - Scope: add a development-only reachable preview that demonstrates explicit blur, badge, and keyboard reveal states on the shared content-card treatment; use a clearly labeled fixture when no local persisted explicit judgment exists, and distinguish fixture data from Core API data.
    - Guardrails: keep production surfaces unchanged and enforcement in shadow mode; honor existing adult preference semantics; missing, stale, pending, error, or invalid summaries never imply safety; do not expose raw judgment details or imply CSS blur prevents image download.
    - Checks: focused Web tests, `make validate-web`, and a browser/e2e check against the existing local stack when available. No live Jev call or production deploy.
    - Route: delegated direct; writer trigger.
    - Status: implementation committed as `ba97df3` (`feat(web): add dev moderation preview`) on `agent/jev-moderation-web-preview`, based on `17c167d`; focused Vitest (3 files/5 tests), Web lint, Web build, and auth-card budget check passed in the existing Web container. `http://localhost:3001/dev/moderation-preview` returned HTTP 200.
    - Browser evidence: at `http://localhost:3001/dev/moderation-preview`, the explicit fixture was visibly blurred; reveal removed the blur and changed the button label to “Blur artwork”. Core ContentItem `1387` loaded through one read-only request and displayed a real `Missing` summary without blur.
    - Gap: no stored explicit sample was verified in the local database; the explicit visual demonstration remains a clearly labeled fixture. Host `make validate-web` was blocked by missing `@playwright/test`, though focused Vitest (3 files/5 tests), Web lint/build, and the auth-card check passed in the mapped container. No live Jev call or production deploy.

  - [x] **JEV-005-DEV-PREVIEW-RELEASE-GATE — Exclude the development moderation preview from production output**
    - Scope: remove or exclude `/dev/moderation-preview` from the production route graph and emitted client/server artifacts while retaining local development access.
    - Acceptance: a production build contains no moderation-preview route chunks or reachable route; local development preview behavior remains available. The existing DEV-only `notFound()` guard is not sufficient for this release gate.
    - Result: configured TanStack Start's router `routeFileIgnorePattern` only when Vite mode is `production`. The source route remains available to development route generation. Moved the synthetic fixture SVG from `public/` to an imported source asset used only by the ignored preview page, so neither the route nor its artwork ships in production.
    - Verification: stopped the worktree-local Web dev container while running `pnpm run build` to prevent concurrent development route-tree generation, then restarted it. Build passed. `rg -l -i 'moderation-preview|DevModerationPreview' web/dist/client web/.output` -> no matches; `find web/.output/public -iname '*moderation-preview*'` -> no files. Built Node server requests `/dev/moderation-preview` and `/moderation-preview-artwork.svg` -> HTTP 404 for both. Development server `/dev/moderation-preview` -> HTTP 200 and rendered fixture SVG as an inline data URL. `pnpm exec vitest run src/test/moderation-core-lookup.test.tsx` -> 1 test passed; `pnpm run lint` -> pass; `pnpm run cards:check` -> 150 WebP files valid, 3,539,278 bytes. Restored build-mutated `web/src/routeTree.gen.ts` and `.nitro` types to the checked-in development version.
    - Runtime harness: local development HTTP request and isolated built-server HTTP request as recorded above; no browser-only behavior was needed for this build/config exclusion.
    - Rollback boundary: revert the production router-ignore setting and the source-asset relocation to restore the prior behavior; revert the associated tracker evidence separately.
    - Commit identity: `fix(web): exclude moderation preview from production routes`, `103d967`, and `fix(web): keep preview fixture artwork out of production`, `930d712` on `agent/jev-moderation-preview-release-gate`.

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
  - [x] **JEV-007-MODERATION-FLOW — Record verified product flow and open decisions**
    - Scope: add an indexed, explicitly unratified design note that separates current implementation, user-requested outcomes, architecture recommendations, and unresolved product/operational choices; include the development-preview release gate.
    - Guardrail: do not represent recommendations as approved architecture, implement admin, create an issue, deploy, or run a production backfill.
    - Result: added `.docs/ideas/jev-content-moderation-product-flow.md` and indexed it in `.docs/README.md`. Updated `.docs/architecture/content-eligibility.md` to distinguish the preview's DEV-only `notFound()` runtime guard from build exclusion. The design note clearly separates verified current behavior, the user-requested outcome, unratified recommendations, and open decisions about pending detail, homepage `needs_review`, freshness, queueing, admin authorization/audit, and rollout.
    - Checks: all linked repository paths exist; `git diff --check` -> pass. The production build verified that both client and server route chunks are emitted while the development guard is present.
    - Commit identity: `feat(web): refine moderation artwork reveal flow`, `aac1f69` on `agent/jev-moderation-ux-decisions`.
    - Route: delegated direct; writer trigger for the design note, documentation index, and this tracker.

- [x] **JEV-003B — Resumable rate-bounded moderation backfill command** (command core complete; incremental scheduling stays in JEV-003C)
  - Stacked slices on `stacked-to-main`, all offline-verified, no live Jev call or backfill performed:
    - Observation `725925c` (`agent/jev-moderation-backfill-observation`): per-invocation `reused`/`called`/current-call `usage` contract; 201 authored lines; 25 service tests OK.
    - Pricing `a06fca1` (`agent/jev-moderation-backfill-metrics`): provenance-rich snapshot, validated rate override, cost estimate; 100 authored lines; 4 tests OK.
    - Accounting `d58b50c` (same branch): bounded retry IDs, counters, item events, summary with truncation count+boolean; 309 authored lines; 14 tests OK.
    - Execution `63f2f98` (`agent/jev-moderation-backfill-execution`): ascending-pk paging, exact limit, delay-between-items, progress cadence, exception isolation; 342 authored lines; 9 runner tests OK (48 with metrics+service).
    - Command `9ef46df` + `aed8c85` (`agent/jev-moderation-backfill-command-v2`): JSONL stdout, atomic `--report`, `--confirm-live` + positive `--limit` gates; 276 authored lines; 8 command tests OK (61 with pre-existing details-command, runner, metrics, service); `makemigrations --check` no changes.
  - Superseded: over-budget `5e8111d` (`agent/jev-moderation-backfill-runner`, 502 lines) is NOT for PR. No PR exists for any slice. Homepage/admin enforcement is NOT complete.
  - Add a resumable, rate-bounded Django management command that iterates eligible `ContentItem` rows and delegates classification to the accepted JEV-003A service. It must resume safely from its own progress cursor and never reclassify fresh judgments with identical identity.
  - Logging contract: structured periodic logs (a bounded periodic heartbeat with progress counts, duration, throughput, classification buckets `safe|explicit|needs_review|explicit_override`, token totals) plus structured final logs with the same fields and an explicit durations section. Estimated-cost summary is optional but, when reported, must carry explicit pricing provenance: the pricing source/config name, the pricing date, and the token-to-cost formula, so the number is auditable.
  - Optional JSON report: an explicit flag may emit the complete run summary as structured JSON on stdout or a user-specified file; JSON must not be the only log path.
  - Safety boundary: no live Jev call in tests or this task. The command and its docs must make live run eligibility depend on explicit operator/CI opt-in flags, not ambient defaults.
  - Checks: command argument/flag validation, idempotent reuse behavior, rate-bound pacing, resume-safety against cursor replay, and offline fake-client log/report assertions. All Django tests are offline.
  - Route: delegated; writer trigger.
  - [x] **JEV-003B-REPORT-PREFLIGHT — Validate the report destination before classification**
    - Problem: the command checked the `--report` parent only after classification, so an invalid destination could waste billable Jev calls.
    - Acceptance: deterministic report-path invalidity fails before runner/classifier calls and creates no files or directories; a valid report still uses the existing atomic write flow.
    - Implementation: validate a non-empty path, reject NUL bytes, require an existing writable parent directory, and reject a directory as the destination before `run_backfill`; `_write_report_atomic` repeats validation before creating its temporary file.
    - Tests: invalid empty, NUL-containing, missing-parent, non-directory-parent, and directory-destination paths produce `CommandError` with zero runner/classifier calls. Missing paths are not created; the valid-path test still confirms atomic output and no temporary leftovers.
    - Verification: `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content.tests.test_backfill_moderation_command content.tests.test_backfill_runner` -> 17 tests OK; `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content` -> 380 tests OK (1 skipped); `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py makemigrations --check --dry-run` -> `No changes detected`; `git show --check 9960fc7` passed. Run from `core/`.
    - Runtime harness: N/A; all tests use offline fakes. No live Jev call or backfill was run.
    - Environment note: the initial non-escalated focused run failed because the sandbox denied writing under this worktree and preflight reported `report directory is not writable`; the final focused and full suites passed after narrow filesystem escalation. No sandbox bypass was used.
    - Commit identity: Conventional Commit `fix(content): preflight moderation report destinations`, full SHA `9960fc77eee26dd79df258b86594c535facf1307`, 91 authored changed lines across the task's four files.
    - Rollback boundary: revert the follow-up tracker-evidence commit first, then revert `9960fc7`; the implementation commit changes only report-path validation, its tests, runbook guidance, and this task entry. It changes no schema or persisted judgments.
    - Route: delegated direct; writer trigger for the command and test, with the runbook and tracker updated alongside behavior.
  - [x] **JEV-003B-EXACT-IDS — Add exact sparse-ID selection to moderation backfill**
    - Scope: add an explicit `--ids` mode that resolves and classifies only the supplied positive ContentItem IDs through the existing bounded runner; preserve range mode and require the existing `--confirm-live` and positive `--limit` safeguards.
    - Acceptance: reject malformed, duplicate, non-positive, conflicting, and missing IDs before any classifier call or report output; report the exact selected count; add no implicit IDs; keep selection read-only and logs free of raw provider payloads or secrets.
    - Checks: offline command tests prove exact classifier IDs, pre-call rejection for invalid/missing IDs, unchanged range behavior, and report writing; run the focused and full Core checks and migration check listed in the parent task.
    - Route: delegated direct; writer trigger (command, tests, runbook, and this tracker update).
    - Result: added one comma-separated `--ids` selector with unique positive decimal ID validation, duplicate/missing-ID preflight, `--after-id` conflict rejection, and a `--limit` floor equal to the selection size. Exact IDs are paged in ascending order through the existing runner using an immutable allowlist; the count is emitted in JSONL and the final/report summary. Range mode is unchanged.
    - Verification: `DATABASE_URL='sqlite://:memory:' MODERATION_CLASSIFICATION_ENABLED=False /Users/emmanuel/Workspace/projects/denn/core/.venv/bin/python manage.py test content.tests.test_backfill_moderation_command content.tests.test_backfill_runner` -> 22 tests OK; the same environment and runner with `manage.py test content` -> 395 tests OK (1 skipped); the same environment and runner with `manage.py makemigrations --check --dry-run` -> `No changes detected`; `git diff --check` -> pass. The first non-escalated focused run was blocked because existing report tests require writing under this worktree; the same offline test run passed after narrow sandbox approval for temporary report output.
    - Runtime harness: N/A; all tests use offline fakes. No live Jev call, local database mutation, production backfill, deployment, or remote operation was performed.
    - Commit identity: Conventional Commit `feat(content): select exact IDs for moderation backfill`, full SHA `102d1a9fb959c29fb19903f21300b3fce3ff0456` on `agent/jev-moderation-exact-id-backfill`; 263 authored changed lines across the four scoped files, within the ~400-line planning advisory.
    - Rollback boundary: revert the tracker-only evidence commit first, then revert `102d1a9`; this work changes only the selector command, its tests, runbook guidance, and this task entry, with no schema or persisted-judgment changes.
    - Route: delegated direct; writer trigger for the command and tests, with runbook and tracker updates alongside behavior.

## Progress and evidence

- Exploration completed by GLM 5.3 Flash in Codex task `01a0c4cd-9ceb-7ba0-a7c1-2d6214d81d8b`.
- Verified existing authoritative content policy in `.docs/architecture/content-eligibility.md`.
- Verified existing `UserPreferences.allow_adult_content` and settings UI precedent.
- Verified no current moderation judgment model or TypeSafe SDK dependency.
- JEV-002 (JEV-002A, JEV-002B, and JEV-002-Q3) and the JEV-003B command core above are implemented and verified offline. JEV-007-MODERATION-FLOW, JEV-005-REVEAL, and JEV-005-DEV-PREVIEW-RELEASE-GATE are complete; JEV-003C and the remaining JEV-004–JEV-007 work remain pending.

## Next step

Next: continue with JEV-003B operator review and JEV-003C incremental scheduling, pending a queue/worker architecture decision. Resolve the open product choices in `.docs/ideas/jev-content-moderation-product-flow.md` before activating enforcement. Provider ingestion remains a separate backlog item. Chain strategy stays `stacked-to-main`. A separate bounded local exact-ID Jev sample was run earlier; no live Jev call was made by this UX/documentation slice, and no production backfill or deployment has occurred.
