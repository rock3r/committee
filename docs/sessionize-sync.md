# Sessionize import and sync

Use Sessionize's supported JSON API to connect an event. The API needs no browser login cookie. Anyone with the endpoint URL can read its data. Keep the URL on the admin machine and out of hosted bundles and userscripts.

## Connect an event

1. Open Sessionize's **API / Embed** and create a dedicated JSON endpoint. Leave endpoints used by the public event website unchanged.
2. Select **Includes sessions: All**. Remove category filters and include unscheduled sessions.
3. Enable the session and speaker fields Committee needs. Include descriptions, biographies, format, track and relevant custom questions. Expose only required fields.
4. Copy the **All** URL from **Get Code**: `https://sessionize.com/api/v2/<endpoint>/view/All`.
5. In Committee, open **Data & sync → Connect another event**. Enter the organiser event ID, event name and endpoint URL.
6. Choose **Check coverage**. Compare the result with Sessionize's organiser count. Exclude service slots such as lunch from that count.
7. Review statuses, field coverage and missing descriptions. Check and confirm the Sessionize scope settings and expected count. Save the connection.
8. Choose **Sync now** to import the event. Saving the source alone imports no data.

The API response cannot identify the organiser event or prove its filter settings. Counts and status distributions help assess coverage but cannot prove completeness.

Committee requires explicit scope confirmation. It rejects missing joins and duplicates, checks required fields and blocks count reductions during sync. Replacing a source that omits imported sessions requires explicit removal confirmation from the local caller.

For a legitimate reduction, run a fresh coverage check and deliberately update the source. A failed refresh preserves the current snapshot.

Committee excludes service sessions and retains each submission's `status`. An explicit `Withdrawn` status sets the withdrawn flag. Committee records missing or unknown statuses as unknown. It never infers a status from a missing record.

Check withdrawn coverage against the organiser list for each endpoint. This connector excludes reviewer comments, gem/nope votes and evaluation results. It makes no claim that the supported API covers them.

The importer validates core arrays and joins category and question definitions by ID. Custom fields stay local. Committee saves the URL in private `sessionize-sources.json` with mode 600. It excludes the URL from status responses, logs, published data and error text.

## Schedule updates

Manual sync is the default. Enable periodic sync separately for each event, with an interval of 15–10,080 minutes. Keep the local service running and the machine awake. The service combines missed intervals into one refresh.

Sync runs mechanical checks only. An administrator must separately request language model analysis, detector checks and publication.

API requests use the Python HTTPS transport and require Python 3.9 or later. They use no cookie jar or browser and refuse redirects. Responses have a 16 MB limit. Reads have timeouts and limited retries for 429 and 5xx responses. Sessionize can cache responses for up to five minutes.

## Use the legacy collector

Installations that need the authenticated organiser collector can configure it explicitly:

```sh
REVIEW_HELPER_DATA=/absolute/private-data node src/cli.ts sessionize-auth /absolute/sessionize.cookies
```

Normal API sync needs no collector setup. The collector uses internal read-only list, stats and detail routes with a Netscape cookie file. Reconnect when the login expires. A saved API source takes precedence for that event.

The collector retains its complete-snapshot checkpoints and historical versions.

## Call the local API

Every route below requires the local admin token. `/api/runtime` alone permits access without that token. Mutation routes reject requests from the Sessionize origin.

| Route | Action |
| --- | --- |
| `POST /api/source/check` | Check a source configuration. Pass `{eventId}` to recheck a saved URL without returning it. |
| `PUT /api/source` | Save a checked source configuration without importing data. |
| `GET /api/sync` | Read redacted `sources`, legacy `credentialConfigured`, configurations and runs. |
| `POST /api/sync {eventId}` | Queue a refresh or reuse an already queued refresh. |
| `PUT /api/sync/config {eventId,enabled,intervalMinutes}` | Set the event schedule. |

A source configuration contains `eventId`, `eventName`, `url`, `expectedCount`, `requiredFields`, `allStatusesConfirmed` and `unscheduledConfirmed`. `requiredFields` holds field names.

The first check accepts `expectedCount:1` as a placeholder. Saving requires the actual count. After reviewing missing IDs, pass `allowRemovalConfirmed:true` on save to acknowledge known removals. This option cannot bypass a complete mismatch with the existing event.

## Verification record

Tests against Sessionize's official demo covered 10 submissions, 10 speakers and one excluded service slot. Checks also covered category, format and track joins, and question definitions.

A real accepted-only endpoint imported 111 sessions and 114 speakers into an isolated database. Its second import changed zero sessions. Committee rejected its incomplete coverage against the full 386-submission event.

A real full-scope API import remains unverified. The complete historical import used the legacy collector.

Sources: [Sessionize API guide](https://sessionize.com/playbook/api), [official demo All response](https://sessionize.com/api/v2/jl4ktls0/view/All).
