# Analysis backend

An administrator starts each analysis job and chooses its event and submission limit. Sync never starts paid checks. Analysis gives reviewers advice. It never votes, ranks, accepts or rejects sessions.

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

The verifier, search, evidence hosts and Pangram are optional. Choose an enabled model ID. Providers must support the Chat Completions JSON-object contract, including `max_completion_tokens` and `store:false`. Compatibility with arbitrary providers remains unverified.

Use a local credential manager to export keys into the server environment. Then run:

```sh
REVIEW_HELPER_DATA=/absolute/private-data node src/cli.ts analysis-config /absolute/private-config.json
REVIEW_HELPER_DATA=/absolute/private-data npm start
```

The configuration stores environment-variable names. API keys stay out of the configuration, browser and published bundle.

The backend uses a Python HTTPS transport with request limits. It never automatically retries failed paid POST requests. Per-run limits restrict call counts. The HTTP adapter also limits output tokens. These limits cannot cap dollar costs. Configure provider spending limits separately.

## Run a limited research batch

`POST /api/analysis/run {eventId,limit}` queues up to 100 changed or unprocessed submission versions. Each version can use at most three Brave searches, one main model call and one verifier call.

Search queries contain speaker names, the title and audience. They exclude private abstracts and notes. Model inputs include the title, abstract, format, existing topics, selected speaker biography, tagline, links and gathered public evidence. The pipeline excludes reviewer comments and outcomes.

Search snippets identify possible sources. The fetcher retrieves at most three returned pages whose exact hosts the operator allows. It requires public IP addresses and pins each resolved socket address. It refuses redirects, limits response sizes, strips scripts and styles, and retains limited text excerpts.

The fetcher cannot parse JavaScript-only pages, redirected pages or PDFs. Failed retrievals remain visible alongside snippets. Reviewers must judge each source's authority themselves.

The model suggests substantive topics and draft editorial, claim and speaker findings. Warning evidence requires exact abstract spans. Source references must resolve to supplied evidence. Validation rejects invented URLs.

The verifier receives the original input, evidence and draft. Committee records its agreement without treating that agreement as proof. All model findings remain tentative and unpublished until human approval. Speaker, circuit and reuse findings also require confirmed identity.

The workflow collects limited research and drafts findings. It cannot fully research professional histories or independently establish technical facts. It cannot automatically establish source date or version applicability, resolve every identity, or compute semantic alternatives across talks. It also cannot prove that relevant evidence is absent.

Check coverage and sources before approving output. An unchecked or problematic proposal can have no findings.

## Approve findings and topics

| Route | Action |
| --- | --- |
| `POST /api/analysis/approve {id,approved,identityConfirmed}` | Set a finding's eligibility for publication. |
| `POST /api/analysis/topics {versionId,approved}` | Approve the inferred topic set. |
| `GET /api/analysis` | Read progress without model endpoint credentials. |

Approved topics merge case-insensitively with explicit tags. Dismissal remains separate and blocks publication even after approval. Content edits create a version and invalidate earlier findings.

Jobs save progress durably. Completed work uses a key containing content version, rubric and configuration. An interrupted model job requires an explicit rerun because a provider may already have billed the request. Provider responses and draft files stay local.

## Run Pangram detection

Detection uses a separate endpoint: `POST /api/detector/run {eventId,limit}`. It sends abstract text only to Pangram's asynchronous task API with `public_dashboard_link:false`.

Committee saves task IDs before polling. Startup resumes known tasks. If submission success is uncertain, Committee records that state without resending. `POST /api/detector/resume {id}` resumes paused polling without submitting another task. `GET /api/detector` reports state without text or credentials.

The cache keys results by selected model and normalised text. Whitespace-only edits reuse a result. Typo edits never start a paid rerun automatically. An administrator must request every detection run.

Generated-text fractions report detector signals. They give neither authorship probabilities nor quality scores. This implementation uses individual tasks. It has no discounted bulk submission or Winston support.

Synthetic adapters test publication approval rules and saved detector tasks. They cannot establish model accuracy. The verification record below states the live checks performed.

References: [Chat Completions](https://platform.openai.com/docs/api-reference/chat/create), [Brave Search](https://api-dashboard.search.brave.com/app/documentation/web-search), [Pangram REST API](https://docs.pangram.com/quickstart-rest).

## Use local Pi providers

The model can use the operator's installed Pi providers:

```json
{"audience":"Android developers","model":{"transport":"pi","provider":"zai","model":"glm-5.3"},"maxOutputTokens":4000}
```

Credentials stay in Pi. Each subprocess receives the submission through stdin and uses low reasoning. It has no tools, workspace context, skills or saved session. Installed provider extensions remain available.

Calls time out after four minutes and have a response-size limit. `maxOutputTokens` applies only to HTTP. Pi uses its provider's output limit. Two submissions run concurrently. Failures need an explicit retry.

Invalid JSON and invalid warning quotations or source references cannot publish partial findings. Committee can repair a normally completed response missing only its final outer object brace. It records this deterministic repair. It rejects truncated responses and internal syntax errors.

The private SQLite `analysis_attempts` table stores diagnostics and exact model inputs. Reader bundles and job-status responses exclude those records.

## Collect selected research sources

Operators can supply sources for repeatable research. Write a private seed array containing `{eventId,sessionId,sources:[{url,title,purpose,speaker?}],speakers:[]}`. Then run:

```sh
REVIEW_HELPER_DATA=/absolute/private-data node scripts/collect-research.ts /absolute/private-seeds.json
```

The collector retrieves public HTTPS pages through the guarded fetcher. It caches pages in the private data directory and records failed retrievals. Operators select these sources themselves. Automatic Brave discovery requires a separate configured key.

Research packets bind to the exact stored submission content. Jobs freeze them when queued. Updated packets change the job cache key. Pass an optional `sessionIds` array to `POST /api/analysis/run` for a targeted validation batch.

The local reading panel shows model speaker assessments and claim checks. It also shows quotation origins, source links, captured excerpts and coverage limits. A person must still confirm these assessments.

Warning findings and topic suggestions require exact abstract spans. Claim checks require exact spans from the abstract, biography or submitted topic-experience fields.

Committee omits invalid optional claim checks and displays a coverage note. The private attempts table retains their original responses. Invalid warning evidence fails the run. Unavailable pages never count as captured evidence.

A later successful analysis replaces earlier model findings as current. Committee retains their history and reviewer dispositions.

## Reuse existing detector output

```sh
REVIEW_HELPER_DATA=/absolute/private-data node src/cli.ts import-snapshot /absolute/sessionize-snapshot.json
REVIEW_HELPER_DATA=/absolute/private-data EVENT_ID=123 node src/cli.ts import-pangram /absolute/pangram-bulk-results.json
```

The snapshot importer accepts the organiser export shape: `eventId`, `capturedAt` and `sessions` containing `description`, `speakers` and `fields`. It excludes old editorial judgments, votes, ranks and reviewer comments. Importing a saved snapshot provides no evidence of a current authenticated Sessionize sync.

Pangram imports match normalised abstract text and detector model. A matching session ID alone cannot establish a match. Importing makes no provider requests.

For reviewed minor edits, set `PANGRAM_REUSE_REVIEW=/absolute/reuse-review.json`. This file maps session IDs to review reasons. Reuse retains the original cache key. An audit entry explains the old and new text hashes. The interface states that it reused an older result. Exclude material edits from this map.

## Verification record

Local checks in September 2026 exercised real GLM-5.3 calls through Pi and captured public sources. They left automated Brave discovery and fresh paid Pangram requests untested. Checks imported existing Pangram outputs instead.

Tests cover frozen research inputs, invalid quotation rejection, invalid or truncated Pi JSON, draft publication approval rules, superseded findings and detector reuse. Keep dataset-specific validation records in the private data directory and out of this repository.

After a validation fix, an explicit `/api/analysis/run` request with `revalidateSaved:true` can reuse a saved valid-JSON response. The job and model input must match exactly. Committee records a revalidation audit event and avoids charging for the same response again.
