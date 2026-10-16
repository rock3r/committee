# Review workspace frontend

The local dashboard runs at `http://127.0.0.1:43127/`. `src/server.ts` serves plain HTML, CSS and JavaScript from `web/` under its Content Security Policy. The frontend needs no build step.

Fable owns the frontend and this document. Codex owns the backend. The dated checks below record earlier interface versions. The [architecture guide](architecture.md) describes the current four-page admin navigation.

## Find and read proposals

The top bar holds search, event selection, topic filtering, view profile, capture freshness and sync access, and **Lock**. Press `/` to focus search. The event selector appears only with multiple loaded events.

The original frontend filtered each session's `eventId` locally pending backend `?eventId=` support. With several events and none selected, proposal rows show their event IDs.

The left proposal list contains every proposal matching the current filters. Each row shows its title, speakers, format and up to three topic chips. Format colours use blue for sessions, green for workshops, violet for keynotes, orange for lightning talks and teal for panels. Each topic name has a stable colour.

Compact state marks count verified, proposed, contested, legacy, measured, detector and dismissed findings. Withdrawn proposals show a separate mark. Sort by title, open findings, recent checks or speaker. **Open findings only** hides proposals without open findings.

The reading column uses a cool background and a white submission panel. It shows the title, speakers, track, format, word count, topics and abstract. Findings follow in severity and state order, then related proposals.

Each finding shows an icon, bold label, state badge and reason. A smaller line shows evidence, actions and origin.

**Compare** opens a second column with a related proposal's abstract and open findings. `Esc` closes it and returns focus to the opening button. Links with `?event=<id>&session=<id>` open a proposal. Adding `&topic=<name>` also applies that topic filter while preserving the selected proposal in the scope line.

## Connect and sync sources

The original **Data** panel listed saved Sessionize sources first. Each entry showed event name, expected count, required fields and the last check.

The add/replace wizard collects event ID, name, API URL and expected count. The URL uses a password field and stays hidden after saving.

**Check coverage** fetches without importing. It lists submission and speaker counts, excluded service sessions, statuses, available custom fields, missing abstracts and warnings. Operators choose required custom fields from that result.

Saving requires a matching expected count and two scope confirmations: all statuses without category filters, and inclusion of unscheduled sessions. Missing previously imported submissions also require a known-removals confirmation, sent as `allowRemovalConfirmed`. The server checks again before saving.

Cookie login appears as a fallback. **Sync now** accepts an event ID or an organiser URL. URL parsing accepts only `/app/organizer/event/<id>` and `/app/organizer/sessions/<id>` pathnames. It ignores fragments.

Each event configuration shows schedule status, its 15–10080 minute interval, last success and next due time. Run entries show status, stage, progress, errors and results.

The panel polls every three seconds during queued or running jobs. A successful run reloads proposals. The 15 September 2026 implementation targeted `GET /api/sync`, `POST /api/sync` and `PUT /api/sync/config`. Before those backend routes existed, it displayed the actual 404 response.

## Review analysis and detector output

`GET /api/analysis` supplies model, verifier and search status without sending keys to the interface. Operators choose an event and a limit from 1 to 100 submissions. Each submission uses one main model call, an optional verifier call and up to three searches.

The job list shows call counts and errors. A separate detector section uses `GET /api/detector`. It requires an explicit paid run and shows the model name. **Resume** applies only to paused tasks.

Model findings appear as **Proposed**. The verifier verdict adds information without changing that state. Each proposal offers **Approve** and **Reject**. Speaker findings require the identity-confirmed checkbox before **Approve** becomes available.

Proposed topics appear in an amber box beneath the chips with approval and rejection actions. Approved inferred chips have dashed borders. Actions call `POST /api/analysis/approve {id, approved, identityConfirmed}` and `POST /api/analysis/topics {versionId, approved}`.

## Publish a reviewed revision

1. Save the reader deployment's HTTPS origin and publisher token locally on the Mac.
2. Preview the bundle and inspect its included and excluded fields.
3. Choose **Publish this revision**. The server checks for changes since preview. This action stays disabled until a deployment exists.
4. Create an invitation. Committee shows its connection code once.
5. Choose **Copy code** or **Copy connect link**. The link uses `<origin>/#connect=<code>`, so the fragment stays out of server requests.
6. Share the code privately. Use **Revoke** in the reviewer list to remove future access.

The reader origin supplies the userscript install link and Tampermonkey **Connect Committee** instructions.

## Read a hosted bundle

The hosting Worker serves the same three frontend files. At startup, the page requests `GET /api/runtime`. A response of `mode: "reader"` selects reader mode.

If that request fails, a non-loopback origin or `#connect=` fragment also selects reader mode. The page requests a reviewer code and calls `GET /api/connection` and `GET /api/bundle?eventId=` at its origin.

Reader mode hides correction and sync controls and uses the bundle's fixed profile. Search and topic filtering run in the browser. Missing abstracts show an omission notice.

Published editorial, claim and speaker findings appear as **Approved**, because bundles include only human-approved findings. Measurements and detector signals retain their own states. A code for another site produces an error. The Worker's Content Security Policy permits only same-origin calls.

The capture button displays **Published <date>**. It opens event and revision information and disconnect instructions. **Disconnect** replaces **Lock** and clears the saved code.

## Finding states

`describe()` in `web/app.js` derives states from supplied fields. It treats missing backend fields as absent.

| State | Condition | Appearance |
| --- | --- | --- |
| Verified | `status: "verified"` or `strength: "verified"` | The interface shows a filled check mark and outlined badge. |
| Verified, major | Verified with `severity: "major"` | The badge has a red fill. |
| Approved | `origin` starts with `analysis-v1` and `humanApproved: true` | The badge has an ink outline and can appear in published copies. |
| Proposed | Model output lacks human approval. Verifier agreement leaves it proposed. | The icon is an amber diamond outline and the badge is amber. |
| Contested | `status: "contested"` | The interface uses amber and shows the reviewer's note. |
| Legacy / unverified | `origin: "legacy-import"` or strength contains `legacy` | The icon is a dashed grey circle and the badge has a dashed border. |
| Measured | `kind: "mechanical"` and `strength: "measured"` | A gauge icon identifies a measured fact without judging quality. |
| Detector | `kind: "detector"` | Violet signals appear separately and never count as open findings. |
| Dismissed | `disposition: "dismissed"` | Muted entries appear last with a reason and **Restore** action. |

Speaker findings missing `identityConfirmed` and `humanApproved` show a warning about badge exclusion. Findings with `reviewer` or `outcome` in `inputClasses` show **uses reviewer input**. The strict-blind profile removes them at the API level.

The abstract underlines quoted spans from `quote`. Clicking a span opens its finding. **Show in abstract** scrolls to the span and briefly highlights it.

## Unlock and correct findings

The browser sends the access token in a bearer header. After unlocking, it saves the token under `committee.accessToken` in `localStorage`. Refreshes reuse it. **Lock** or a server 401 removes it and restores the unlock screen. The server rejects cookie authentication.

**Dismiss…** opens a required reason field inside the finding. **Add note** records context while leaving the finding open. Both call `POST /api/disposition`, then reload data while preserving reading-column scroll position. Focus moves to the finding's **Restore** or note action.

## Keyboard and motion

Single-key shortcuts work outside text fields:

| Key | Action |
| --- | --- |
| `j` / `k` | Select the next or previous proposal. |
| `/` | Focus search. |
| `e` | Expand or collapse all evidence. |
| `d` | Dismiss the focused finding. |
| `c` | Compare the closest related proposal. |
| `?` | Open shortcut help. |
| `Esc` | Close the active panel. |
| Arrow keys | Move within the proposal list. |
| Tab | Reach controls in focus order. |

Motion patterns follow transitions.dev. Proposal changes use a 120 ms entrance without an exit delay. Evidence uses a 250 ms grid-row accordion. The compare panel reveals over 350 ms. Tooltips enter over 120 ms and hide immediately.

A rejected token or empty reason triggers an error shake. Loading uses a skeleton pulse followed by a reveal. `prefers-reduced-motion: reduce` sets durations to zero and skips JavaScript waits.

## Data and endpoint contracts

`GET /api/sessions` returns `sessions[]`, `labels` and `status`. Session fields are `id`, `eventId`, `title`, `abstract`, `speakers[]`, `topics[]`, `track[]`, `format[]`, `withdrawn`, `versionId`, `contentHash` and `findings[]`.

Finding fields are `id`, `label`, `reason`, `quote`, `sources[{url,title,excerpt,date}]`, `kind`, `strength`, `inputClasses`, `origin`, `identityConfirmed`, `humanApproved`, `disposition` and `note`.

Optional finding fields are `status`, `severity`, `checkedAt`, `coverage`, `verifier`, `contestedBy` and `contestNote`. Topics can use `{label, source: "tag" | "inferred"}`.

The browser computes and labels related proposals from shared topics or speakers within the current import. It also computes topic counts.

Admin calls include `GET/POST /api/source(/check)`, `GET /api/sync`, `POST /api/sync` and `PUT /api/sync/config`. Publication uses `GET /api/publication`, `POST /api/publication/{target,preview,publish,invite,revoke}` and `GET /api/publication/readers`.

Hosted reader calls use a bearer reader token with `GET /api/connection` and `GET /api/bundle?eventId=`.

The original frontend request list included severity, status and coverage fields; richer disposition statuses returning updated findings; merged topic sources; and `{error}` validation messages. These were backend requests at the time of that record.

## Validation records

`node --test web/` runs `web/app.test.mjs`. It loads `web/app.js` in a stub DOM and tests state derivation, ordering, related scoring, sorting and topic shapes.

### Fictional fixture, 15 September 2026

Checks used 25 fictional proposals and 40 findings. Visual inspection covered 1440×900 desktop and 375/390-pixel narrow layouts. Cases included long abstracts, dense findings, contested findings, identity restrictions, dismissals, withdrawn proposals and empty states.

Checks also covered unlock errors, shortcuts and hover, focus and touch tooltips. axe-core 4.13 reported zero violations. Reduced motion received code review only; browser emulation remained untested.

### Integration checks

Event names and capture dates come from `status.events`. Workspace keys include event IDs. Related proposals remain within the selected event, as do topic counts. Completed syncs refresh the cached list once per run. Polling preserves unsaved values and focus.

Live private-import checks used 386 sessions from 2025 and a 40-session 2026 pilot. They covered interval save and restore, event switching and deep links. Visual checks at 1280 and 390 pixels covered the populated Data panel. Fixes addressed toolbar overflow and narrow panel layout.

### Speaker details and topics, 16 September 2026

Speaker buttons expand submitted biographies, model research assessments, source links and other same-event submissions. Missing research displays an explicit notice.

The local topic filter and chips include unapproved suggestions labelled **inferred, proposed**. Filtering leaves approval and publication unchanged. Submitted tags take precedence over case-insensitive duplicates. The API keeps `submittedTopics` separate from the approved merged list. Published readers receive only allowed, approved topics.

Live local-import checks covered speaker expansion, inferred topic selection and chip navigation at 1280 and 390 pixels. Research covered 12 of 383 imported 2026 proposals. Unanalysed proposals reported that topic generation had not run. All 29 backend and 13 frontend tests passed in that record.
