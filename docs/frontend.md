# Review workspace (web/)

The local dashboard at `http://127.0.0.1:43127/`. Plain HTML, CSS and JavaScript in `web/`, served by `src/server.ts` under its Content Security Policy. No build step. The frontend and this document are owned by Fable; the backend is owned by Codex.

## What the reviewer sees

- **Top bar**: search (press `/`), an Event selector (shown only when more than one event is loaded; filters client-side on each session's `eventId` until the backend adds `?eventId=`), topic filter, view profile, the Data button (capture freshness and sync), Lock. With several events loaded and none selected, docket rows show the event ID.
- **Docket rail** (left): every proposal in the current filter. Each row shows the title, a coloured format tag (session blue, workshop green, keynote violet, lightning orange, panel teal), speakers, up to three topic chips coloured by a stable hue per topic name, a compact cluster of coloured state marks (counts of verified, proposed, contested, legacy, measured, detector and dismissed findings) and a Withdrawn mark. Sort by title, open findings first, recently checked or speaker. "Open findings only" hides proposals with nothing open.
- **Reading column** (right): a desk in the cool ground tone. The submission sits on it as one white sheet: title, speakers, track, format, word count, topic chips and the abstract at reading width. Below the sheet: findings ordered by severity and state (state icon in a gutter, bold label and badge, reason, then one small line with evidence, actions and provenance), then related proposals.
- **Data panel** (capture text in the top bar): a Sources section first (saved Sessionize API sources with event name, expected count, required fields and last check; an add/replace wizard: event ID, event name, API URL entered as a password field and never shown again, expected count, then "Check coverage" which fetches without importing and lists count, speakers, excluded service sessions, statuses, available custom fields, missing abstracts and warnings; required custom fields are chosen from that list; two explicit confirmations (all statuses with no category filters; unscheduled included); "Save source" is enabled only when the check count equals the expected count, the confirmations are ticked and, when the endpoint no longer lists submissions that are already imported, a separate "known removals" box is ticked (sent as `allowRemovalConfirmed`); the server verifies again), then the cookie login as a fallback, "Sync now" for an event ID or an organiser URL (only the pathname forms `/app/organizer/event/<id>` and `/app/organizer/sessions/<id>` are accepted; hashes are ignored), one row per configured event (scheduled on/off, interval 15 to 10080 minutes, last success, next due), and the run list with status, stage, progress, errors and results. It polls every 3 seconds while a run is queued or running and reloads the proposals when a run succeeds. Built to the contract Codex announced on 2026-09-15 (`GET /api/sync`, `POST /api/sync`, `PUT /api/sync/config`); until the backend ships it, the panel shows the server's real 404.
- **Analysis and detector** (inside the Data panel): provider status from `GET /api/analysis` (model, verifier, web search; keys never reach the UI), a bounded run (event plus 1 to 100 submissions; each uses one model call, one verifier call if configured and up to three searches) and the job list with call counts and errors; a separate AI-text detector section (`GET /api/detector`, explicit paid run with the model name, Resume for paused tasks only). Model-written findings arrive as "Proposed" with the verifier verdict shown as information; on the proposal each carries Approve and Reject (speaker findings also need the "identity confirmed" box, and Approve stays disabled until it is ticked). Proposed topics appear in an amber box under the topic chips with Approve topics and Reject; approved ones merge into the chips as inferred (dashed). Approval is `POST /api/analysis/approve {id, approved, identityConfirmed}` and `POST /api/analysis/topics {versionId, approved}`.
- **Publishing** (inside the Data panel):
  - Save the reader deployment with its HTTPS origin and a publisher token kept on this Mac.
  - Preview the bundle locally. The preview lists the data it includes and excludes.
  - Choose "Publish this revision" after saving a deployment. The server checks that the data has not changed. The button stays disabled until a deployment is saved.
  - Use Revoke in the reviewer list to remove access.
  - Create an invitation to get a connection code shown once. Use "Copy code" or "Copy connect link" (`<origin>/#connect=<code>`). The fragment never reaches a server.
  - Open the userscript install link on the reader origin. Follow the Tampermonkey "Connect Committee" directions.
- **Reader mode**: the same three files are served by the hosting Worker. The page asks `GET /api/runtime` at boot; when it answers `mode: "reader"` (or, if that call fails, when the page is not on loopback or opens with `#connect=`), it asks for a reviewer connection code instead of the local token, calls `GET /api/connection` and `GET /api/bundle?eventId=` on the code's origin, and renders the published copy read-only: no corrections, no sync, the profile fixed to the bundle's, published editorial, claim and speaker findings shown as Approved (the bundle only carries human-approved ones; measurements and detector signals keep their own states), an invitation for another site refused with a clear message (the Worker's CSP only allows same-origin calls), search and topic filters applied in the browser, abstracts marked as omitted when the bundle has none. The capture button shows "Published <date>" and opens a summary of events, revisions and the disconnect instruction; Lock becomes Disconnect and clears the stored code.
- **Deep links**: `?event=<id>&session=<id>` opens a proposal; adding `&topic=<name>` (as the userscript's inferred-topic links do) applies the topic filter on arrival while keeping that proposal selected and named in the scope line.
- **Compare column**: opens in place when the reviewer chooses "Compare" on a related proposal. It shows the other proposal's abstract and open findings. `Esc` closes it and focus returns to the button that opened it.

## Finding states

The state is derived in `describe()` in `web/app.js`. Fields that the backend does not send yet are handled as absent, never guessed.

| State | Derived from | Look |
| --- | --- | --- |
| Verified | `status: "verified"` or `strength: "verified"` | filled check mark, outlined badge |
| Verified, major | verified and `severity: "major"` | filled red badge |
| Approved | model-proposed (`origin` starts with `analysis-v1`) and `humanApproved: true` | ink outline badge; can appear in badges and published copies |
| Proposed | model output without human approval (default; a verifier model agreeing does not change it) | amber diamond outline, amber badge |
| Contested | `status: "contested"` | amber, with the reviewer's note |
| Legacy / unverified | `origin: "legacy-import"` or strength containing "legacy" | dashed grey circle, dashed badge |
| Measured | `kind: "mechanical"` with `strength: "measured"` | gauge icon; a fact, not a judgement |
| Detector | `kind: "detector"` | violet, listed in its own section, never counted as an open finding |
| Dismissed | `disposition: "dismissed"` | listed last, muted, with the reason and a Restore action |

Speaker findings without `identityConfirmed` and `humanApproved` show a warning that they are not shown as badges. Findings whose `inputClasses` include `reviewer` or `outcome` carry a "uses reviewer input" badge; the strict-blind profile removes them at the API level.

Quoted spans (`quote`) are underlined in the abstract. Clicking a span opens the finding; "Show in abstract" scrolls to and flashes the span.

## Unlocking

The access token is sent as a bearer header. After a successful unlock it is stored in the browser's `localStorage` (key `committee.accessToken`) so a refresh does not ask again. Lock removes it; a 401 from the server also removes it and returns to the unlock screen. The server rejects cookie-based access by design, so cookies are not used.

## Corrections

"Dismiss…" reveals a reason field inside the finding. A reason is required. "Add note" keeps the finding open and records context. Both call `POST /api/disposition` and then reload the data, keeping the reading column's scroll position. Focus moves to the finding's Restore or note action.

## Keyboard

Single keys work when focus is outside a text field: `j` / `k` next or previous proposal, `/` search, `e` expand or collapse all evidence, `d` dismiss the focused finding, `c` compare with the closest related proposal, `?` shortcut sheet, `Esc` close. Arrow keys move within the docket. Everything is also reachable with Tab.

## Motion

Patterns adapted from transitions.dev: a 120 ms enter cue when the proposal changes (no exit phase, so moving on never waits), accordion for evidence (250 ms, grid rows), panel reveal for the compare column (350 ms), tooltip 120 ms in and instant out, error shake on a rejected token or empty reason, skeleton pulse then reveal while loading. `prefers-reduced-motion: reduce` sets every duration to zero and skips the JavaScript waits.

## Data the UI consumes

From `GET /api/sessions`: `sessions[]` with `id, eventId, title, abstract, speakers[], topics[], track[], format[], withdrawn, versionId, contentHash, findings[]`; `labels`; `status`. From each finding: `id, label, reason, quote, sources[{url,title,excerpt,date}], kind, strength, inputClasses, origin, identityConfirmed, humanApproved, disposition, note`. Optional fields rendered when present: `status, severity, checkedAt, coverage, verifier, contestedBy, contestNote`, and topics as `{label, source: "tag" | "inferred"}`.

Computed in the browser, and labelled as such: related proposals (shared topics or speaker within the current import) and the topic list with counts.

Admin endpoints used: `GET/POST /api/source(/check)`, `GET /api/sync`, `POST /api/sync`, `PUT /api/sync/config`, `GET /api/publication`, `POST /api/publication/{target,preview,publish,invite,revoke}`, `GET /api/publication/readers`. Reader endpoints (hosted origin, Bearer reader token): `GET /api/connection`, `GET /api/bundle?eventId=`. Still requested from the backend: severity/status/coverage fields on findings, richer disposition statuses returning the updated finding, merged topic sources, and validation messages surfaced as `{error}` instead of the generic 400 text.

## Tests

`node --test web/` runs `web/app.test.mjs`, which loads `web/app.js` in a stubbed DOM and checks state derivation, ordering, related scoring, docket sorting and topic shapes.

## Validation done on 2026-09-15

Synthetic fixture only (25 invented proposals, 40 findings). Desktop 1440×900 and narrow 375/390 renders inspected; long abstract, dense findings, contested, identity-gated, dismissed, withdrawn and empty states; unlock errors; keyboard shortcuts; tooltips on hover, focus and touch; axe-core 4.13 with no violations. Reduced motion was reviewed in code, not emulated.

## Integration verification

Event names and capture dates come from `status.events`. Workspace session keys are event-scoped; links use `?event=<id>&session=<id>`. Related proposals stay within the selected proposal’s event. Topic counts are scoped to the selected event. Completed syncs refresh the full cached list once per run; polling preserves unsaved form values and focus.

Validated against the live private import: 386 sessions from 2025 and the 40-session 2026 pilot, interval save/restore, event switching, and deep links. Visually checked at 1280px and 390px with the populated Data panel; fixed toolbar overflow and narrow panel layout.

## Speaker details and inferred topics (2026-09-16)

Speaker-name buttons expand submitted biographies, model research assessments with source links, and other submissions in the same event. Missing research is stated explicitly. The local topic filter and proposal chips include unapproved inferred suggestions, marked “inferred, proposed”; filtering does not approve or publish them. Submitted tags take precedence over case-insensitive duplicates. The API preserves `submittedTopics` separately from the approved merged list. Published readers continue to receive only the allowed, approved topic data.

Validated with the real local import: speaker expansion, inferred topic dropdown and chip navigation, desktop 1280px and mobile 390px layout. Research currently covers 12 of the 383 imported 2026 proposals; unanalysed proposals say inferred topics have not been generated. All 29 backend and 13 frontend tests pass.
