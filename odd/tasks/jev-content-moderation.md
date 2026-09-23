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

## Progress and evidence

- Exploration completed by GLM 5.3 Flash in Codex task `01a0c4cd-9ceb-7ba0-a7c1-2d6214d81d8b`.
- Verified existing authoritative content policy in `.docs/architecture/content-eligibility.md`.
- Verified existing `UserPreferences.allow_adult_content` and settings UI precedent.
- Verified no current moderation judgment model or TypeSafe SDK dependency.
- JEV-002 (JEV-002A, JEV-002B, and JEV-002-Q3) is implemented and verified offline; the JEV-003B command core above is implemented and verified offline; JEV-003C and JEV-004–JEV-007 remain pending.

## Next step

Next: continue with JEV-003B operator review and JEV-003C incremental scheduling, pending a queue/worker architecture decision. Provider ingestion remains a separate backlog item. Chain strategy stays `stacked-to-main`. No live Jev call or backfill has been performed in any slice.
