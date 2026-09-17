# Analysis backend

The local service runs bounded jobs. Sync does not trigger paid checks. The admin explicitly selects an event and a maximum number of submissions. Advisory outputs never vote, rank, accept or reject sessions.

## Configure providers

Create a private JSON file outside the repository:

```json
{
  "audience": "Android developers attending a technical conference",
  "model": {
    "url": "https://api.openai.com/v1/chat/completions",
    "model": "YOUR_MODEL_ID",
    "keyEnv": "COMMITTEE_MODEL_KEY"
  },
  "verifier": {
    "url": "https://YOUR_PROVIDER/v1/chat/completions",
    "model": "YOUR_SECOND_MODEL_ID",
    "keyEnv": "COMMITTEE_VERIFIER_KEY"
  },
  "maxOutputTokens": 4000,
  "searchKeyEnv": "COMMITTEE_BRAVE_KEY",
  "evidenceHosts": ["developer.android.com", "kotlinlang.org", "docs.gradle.org"],
  "pangram": {"keyEnv": "COMMITTEE_PANGRAM_KEY", "model": "pangram-4"}
}
```

Verifier, search, evidence hosts and Pangram are optional. The model adapter uses the Chat Completions JSON-object contract (`max_completion_tokens`, `store:false`); a provider must support it. Arbitrary providers have not been compatibility-certified. Use an enabled model ID. Export keys into the server process environment through your preferred local credential manager, then:

```sh
REVIEW_HELPER_DATA=/absolute/private-data node src/cli.ts analysis-config /absolute/private-config.json
REVIEW_HELPER_DATA=/absolute/private-data npm start
```

The config stores environment-variable names, not the API keys. No keys enter the browser or bundle. The backend uses a bounded Python HTTPS transport; failed paid POSTs are not automatically retried. Per-run limits bound calls and (for the HTTP adapter) output tokens, **not dollar cost**. Configure vendor spending limits separately.

## Workflow and evidence

`POST /api/analysis/run {eventId,limit}` queues up to 100 changed/unprocessed submission versions. Each can make at most three Brave searches, one main model call, and one verifier call. Queries contain speaker names/title and audience; private abstracts and notes are not search queries. Model payloads contain title, abstract, format, existing topics, selected speaker biography/tagline/links, and gathered public evidence. Reviewer comments and outcomes are not used by this pipeline.

Search snippets are labelled as leads. At most three returned pages are fetched when their exact host is operator-allowed. Fetches require public IP addresses, pin the resolved socket address, refuse redirects, limit response size, strip scripts/styles and retain a bounded text excerpt. JavaScript-only pages, redirected pages and PDFs are not parsed. Failed page retrieval remains visible as a snippet/fetch failure. Sources do not become authoritative merely by being retrieved.

The model proposes substantive topics and draft editorial/claim/speaker findings. Exact abstract spans are mandatory. Source references must resolve to supplied evidence; arbitrary invented URLs cannot enter a finding. The verifier sees the original input and evidence alongside the draft. Its agreement is recorded, not treated as factual proof. All model findings remain tentative and unpublished pending human approval. Speaker/circuit/reuse findings also require confirmed identity.

The pipeline currently provides a bounded research-and-draft workflow, **not** a comprehensive professional-history crawler or an autonomous technical fact-checker. It does not establish source date/version applicability automatically, resolve identities across all platforms, compute semantic cross-talk alternatives, or prove that no relevant evidence exists. Inspect coverage and sources before approving. A missing finding is not an endorsement.

`POST /api/analysis/approve {id,approved,identityConfirmed}` controls finding publication eligibility. `POST /api/analysis/topics {versionId,approved}` approves the inferred topic set. Approved topics merge case-insensitively with explicit tags. `GET /api/analysis` exposes progress without model endpoint credentials. Dismissals remain separate and suppress publication even after approval. Content edits create a new version and invalidate previous findings.

Analysis jobs are durable. Completed work is keyed by content version, rubric and config. Interrupted model jobs require an explicit rerun because requests may already have been billed. Provider responses and draft artifacts stay local.

## Pangram

Detection is separate: `POST /api/detector/run {eventId,limit}` sends **abstract text only** to Pangram's asynchronous task API with `public_dashboard_link:false`. Task IDs persist before polling. Startup resumes known tasks; ambiguous submissions are marked uncertain rather than resent. `POST /api/detector/resume {id}` resumes paused polling without a new submission. `GET /api/detector` reports state without text or credentials.

Results are cached by selected model and normalized text. Whitespace-only edits reuse the result; typo edits do not trigger a paid rerun automatically because detection is always an explicit action. Generated-text fractions are detector signals, not authorship probabilities or quality scores. This implementation uses individual tasks, not discounted bulk submission. Winston is not implemented.

See the live-validation scope below. Synthetic adapters also test publication gating and detector task persistence; they do not establish model accuracy.

References: [Chat Completions](https://platform.openai.com/docs/api-reference/chat/create), [Brave Search](https://api-dashboard.search.brave.com/app/documentation/web-search), [Pangram REST API](https://docs.pangram.com/quickstart-rest).

## Local Pi transport and captured research

A model can alternatively use the operator's installed Pi providers:

```json
{"audience":"Android developers","model":{"transport":"pi","provider":"zai","model":"glm-5.3"},"maxOutputTokens":4000}
```

Pi credentials remain in Pi. Each subprocess receives the submission via stdin, has no tools, workspace context, skills or saved session, and uses low reasoning. Installed provider extensions remain available. Calls have a four-minute timeout and a bounded response size. **`maxOutputTokens` applies to the HTTP adapter only; Pi uses its provider's output limit.** Two submissions run concurrently. Failures require an explicit retry. Invalid JSON and warning quotation/source references never publish partial findings. A normally completed response missing only its final outer object brace can be repaired deterministically, with that repair recorded; truncated responses and internal syntax errors are rejected. Diagnostics and exact model inputs remain in the private SQLite `analysis_attempts` table; they are excluded from reader bundles and job-status responses.

For reproducible, operator-guided research, write a private seed array containing `{eventId,sessionId,sources:[{url,title,purpose,speaker?}],speakers:[]}` and run:

```sh
REVIEW_HELPER_DATA=/absolute/private-data node scripts/collect-research.ts /absolute/private-seeds.json
```

The collector retrieves public HTTPS pages through the guarded fetcher and caches them under the private data directory. It records failed retrievals instead of silently treating them as checked. This is **source collection, not automatic web discovery**. Brave discovery requires its own configured key. Research packets bind to the exact stored submission content and are frozen when enqueued. Updated packets change the job cache key. `POST /api/analysis/run` optionally accepts a `sessionIds` array for a targeted validation batch.

The local reading panel shows speaker assessments, claim checks, exact quotation origin (abstract or biography), source links, captured excerpts and coverage limitations. These are model assessments, not human confirmations. The system requires exact abstract spans for warning findings and topic suggestions, and exact abstract, biography or submitted topic-experience spans for claim checks. Invalid optional claim checks are omitted with a visible coverage note; their original responses remain in the private attempts table. Invalid warning evidence still fails the run. Unavailable pages do not count as captured evidence. A later successful analysis supersedes earlier model findings while retaining the history and reviewer dispositions.

## Reusing existing detector output

```sh
REVIEW_HELPER_DATA=/absolute/private-data node src/cli.ts import-snapshot /absolute/sessionize-snapshot.json
REVIEW_HELPER_DATA=/absolute/private-data EVENT_ID=123 node src/cli.ts import-pangram /absolute/pangram-bulk-results.json
```

The snapshot importer accepts the organiser export shape (`eventId`, `capturedAt`, `sessions` with `description`, `speakers` and `fields`). It excludes old editorial judgments, votes, ranks and reviewer comments. This is a saved-snapshot import, not evidence that authenticated Sessionize sync was performed today.

Pangram bulk output is matched by normalized abstract text and detector model, not merely by session ID. No provider requests are made. For reviewed minor edits, `PANGRAM_REUSE_REVIEW=/absolute/reuse-review.json` supplies a map of session ID to review reason. Reuse retains the original cache key and an audit entry explaining the old/new text hashes; the UI states that an older result was reused. Material edits must not be included in this map.

Real GLM-5.3 calls through Pi and captured public sources were exercised locally in September 2026. Automated discovery through Brave and fresh paid Pangram requests were not exercised; existing Pangram outputs were imported instead. Tests cover frozen research inputs, invalid quotation rejection, invalid/truncated Pi JSON, draft publication gating, superseded findings and detector reuse. Corpus-specific validation receipts belong in the private data directory, never this repository.

An explicit `/api/analysis/run` request with `revalidateSaved:true` can reuse a saved valid-JSON response after a validation fix only for the same job and exactly matching model input. It records a revalidation audit event instead of charging for the same response again.
