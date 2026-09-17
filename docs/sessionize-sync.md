# Sessionize import and sync

Use Sessionize's supported JSON API for normal setup. It needs no browser login cookie. The endpoint URL is a bearer secret: keep it on the admin machine, never in the hosted bundle or userscript.

## Connect an event

1. In Sessionize, open **API / Embed** and create a dedicated JSON endpoint. Do not change an endpoint used by the public event website.
2. Select **Includes sessions: All**, remove category filters, and include unscheduled sessions. Enable the required session/speaker fields, including descriptions, biographies, format, track and relevant custom questions. Expose only fields Committee needs.
3. Copy the **All** URL from **Get Code**: `https://sessionize.com/api/v2/<endpoint>/view/All`.
4. In Committee's local **Data & sync → Connect another event**, enter the organiser event ID, event name and URL. Choose **Check coverage**. Compare the count with Sessionize's organiser count, excluding service slots such as lunch.
5. Review statuses, field coverage and missing descriptions. Confirm the Sessionize scope settings and expected count, then save. **Sync now** imports the event; saving a source does not import it.

The API doesn't identify the organiser event or prove its own filters. Counts and status distribution are evidence, not proof of completeness. Committee requires explicit scope confirmation, rejects missing joins/duplicates, checks required fields, and blocks count reductions during sync. Replacing a source that omits existing imported sessions is blocked unless the local caller explicitly confirms removals. A legitimate reduced dataset requires a fresh coverage check and deliberate source update; failed refreshes preserve the current snapshot.

Service sessions are excluded. Submission `status` is retained, and an explicit `Withdrawn` status maps to withdrawn. Unknown/missing status is recorded as unknown, not inferred from absence. Full withdrawn coverage must be checked against the organiser list for each configured endpoint. Reviewer comments, gem/nope votes and evaluation results are **not** part of this connector; there is no claim of supported API coverage for them.

API category/question definitions join by ID. Core arrays are validated, and custom fields remain local. The endpoint itself never appears in status responses, logs, published data or error text. It is saved in `sessionize-sources.json` in the private data directory with mode 600.

## Scheduling

Manual-only is the default. Enable periodic sync per event, 15–10,080 minutes. The local service must be running and the machine awake. Missed intervals coalesce into one refresh. No LLM or detector runs automatically after sync: only mechanical checks run. Analysis and publication are separate explicit actions.

API requests use the Python HTTPS transport (Python 3.9+), with no cookie jar, redirects, or browser dependency. Responses are bounded to 16 MB; reads have timeouts and bounded retries on 429/5xx. Sessionize caches API responses for up to five minutes.

## Legacy fallback

The old authenticated organiser collector remains for installations that explicitly need it. It is **not** the preferred setup and is not necessary for API sync:

```sh
REVIEW_HELPER_DATA=/absolute/private-data node src/cli.ts sessionize-auth /absolute/sessionize.cookies
```

It uses internal read-only list/stats/detail routes and a Netscape cookie file. Login expiry requires reconnecting. A saved API source takes precedence for that event. Its complete-snapshot checkpoint handling and historical version retention remain available.

## Local API

All except `/api/runtime` require the local admin token. Mutations reject the Sessionize origin.

- `POST /api/source/check`: source configuration, or `{eventId}` to re-check the saved URL without revealing it.
- `PUT /api/source`: verified source configuration; does not import.
- `GET /api/sync`: redacted `sources`, legacy `credentialConfigured`, configs and runs.
- `POST /api/sync {eventId}`: queues/deduplicates a refresh.
- `PUT /api/sync/config {eventId,enabled,intervalMinutes}`: schedule.

Source configuration: `eventId`, `eventName`, `url`, `expectedCount`, `requiredFields` (field names), `allStatusesConfirmed`, `unscheduledConfirmed`. For a first check, `expectedCount:1` is allowed as a placeholder; save requires the actual count. Optional `allowRemovalConfirmed:true` on save acknowledges known missing IDs after reviewing coverage; it never bypasses a complete mismatch with the existing event.

## Verification record

The new connector was exercised against Sessionize's official demo: 10 submissions, 10 speakers, one excluded service slot, category/format/track joins and question definitions validated. A real accepted-only event endpoint was also fetched twice into an isolated database: 111 sessions and 114 speakers; the second import changed zero sessions. Its incomplete coverage was rejected against the full 386-submission event. A full-scope real event API import remains unverified; the complete historical import used the legacy collector.

Sources: [Sessionize API guide](https://sessionize.com/playbook/api), [official demo All response](https://sessionize.com/api/v2/jl4ktls0/view/All).
